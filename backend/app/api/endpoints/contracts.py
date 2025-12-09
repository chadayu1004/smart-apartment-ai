# backend/app/api/endpoints/contracts.py
from typing import Optional
import os
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlmodel import Session, select
from sqlalchemy import cast, Integer, desc

from app.core.database import get_session
from app.models.contract import Contract
from app.models.user import User
from app.api.endpoints.auth import get_current_user
from app.models.notification import Notification


router = APIRouter(
    prefix="/contracts",
    tags=["Contracts"],
)


# ===================== DTOs =====================

class ContractByBookingResponse(BaseModel):
    """
    response ที่ส่งให้ frontend เวลาเรียก /contracts/by-booking/{booking_id}
    """
    contract_id: int
    contract_no: Optional[str] = None
    contract_pdf_url: Optional[str] = None


class MyContractResponse(BaseModel):
    contract_id: int
    room_id: int
    deposit_status: str
    deposit_amount: float
    contract_pdf_url: Optional[str] = None
    deposit_slip_url: Optional[str] = None


# ===================== 0) ดึงสัญญาจาก booking =====================

@router.get("/by-booking/{booking_id}", response_model=ContractByBookingResponse)
def get_contract_by_booking(
    booking_id: int,
    session: Session = Depends(get_session),
):
    """
    ดึง "สัญญามัดจำ" จาก booking_id

    ใช้ booking_id ที่เก็บอยู่ใน JSONB: Contract.ocr_data["booking_id"]
    ซึ่งเซ็ตไว้ตอนสร้างสัญญาใน bookings.approve_booking:

        ocr_data = {
            "source": "booking_approval",
            "booking_id": booking.id,
            "ai_score": booking.ai_confidence,
            "ai_status": booking.ai_status,
            "id_card_number": booking.id_card_number,
        }

    เงื่อนไข:
    - contract_type = "deposit"  (เฉพาะสัญญามัดจำ)
    - ดึงอันล่าสุดสุด ด้วย order_by(Contract.id.desc())
    """
    stmt = (
        select(Contract)
        .where(
            Contract.contract_type == "deposit",
            cast(Contract.ocr_data["booking_id"].astext, Integer) == booking_id,
        )
        .order_by(desc(Contract.id))
    )

    contract = session.exec(stmt).first()

    if not contract:
        raise HTTPException(
            status_code=404,
            detail="ยังไม่พบสัญญามัดจำสำหรับคำขอจองนี้",
        )

    return ContractByBookingResponse(
        contract_id=contract.id,
        contract_no=contract.contract_no,
        contract_pdf_url=contract.contract_pdf_url,
    )


# ===================== helpers เก็บไฟล์สลิป =====================

def save_deposit_slip(file: UploadFile, contents: bytes) -> str:
    """
    เซฟรูป/ไฟล์หลักฐานการชำระเงินลง media/deposit_slips
    แล้วคืนค่าเป็น relative path เช่น /media/deposit_slips/xxx.png
    """
    media_dir = os.path.join("media", "deposit_slips")
    os.makedirs(media_dir, exist_ok=True)

    ext = os.path.splitext(file.filename or "")[1] or ".jpg"
    filename = f"slip_{uuid.uuid4().hex}{ext}"
    path = os.path.join(media_dir, filename)

    with open(path, "wb") as f:
        f.write(contents)

    return f"/media/deposit_slips/{filename}"


# ===================== 1) Tenant แนบสลิปการชำระเงิน =====================

@router.post("/{contract_id}/upload-slip")
async def upload_deposit_slip(
    contract_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    tenant แนบหลักฐานการชำระเงินมัดจำ
    - อัปเดต deposit_slip_url
    - เปลี่ยน deposit_status -> 'paid' (แบบ auto-approve ง่าย ๆ ก่อน)
    """
    contract = session.get(Contract, contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="ไม่พบสัญญา")

    # ป้องกันไม่ให้คนอื่นอัปโหลดให้สัญญาคนอื่น
    if current_user.role != "tenant":
        raise HTTPException(status_code=403, detail="เฉพาะผู้เช่าเท่านั้นที่แนบสลิปได้")

    contents = await file.read()
    slip_url = save_deposit_slip(file, contents)

    contract.deposit_slip_url = slip_url
    contract.deposit_status = "paid"  # ✅ ถือว่าชำระแล้ว (ถ้าจะมีอนุมัติแยกทีหลังค่อยเพิ่ม field ใหม่)
    contract.deposit_paid_at = datetime.utcnow()
    session.add(contract)

    # ---------- ✅ mark แจ้งเตือน 'deposit_due' เป็นอ่านแล้ว ----------
    stmt = select(Notification).where(
        Notification.user_id == current_user.id,
        Notification.type == "deposit_due",
        Notification.is_read == False,  # noqa: E712
        Notification.data["contract_id"].astext == str(contract_id),
    )
    notifs = session.exec(stmt).all()
    for n in notifs:
        n.is_read = True
        session.add(n)

    session.commit()
    session.refresh(contract)

    return {
        "message": "อัปโหลดหลักฐานการชำระเงินเรียบร้อย",
        "deposit_status": contract.deposit_status,
        "deposit_slip_url": contract.deposit_slip_url,
    }


# ===================== 2) ดึงสัญญาของ tenant ปัจจุบัน =====================

@router.get("/me/latest", response_model=MyContractResponse)
def get_my_latest_contract(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    ดึงสัญญา 'ล่าสุด' ของ user ปัจจุบัน
    (ใช้ในหน้า 'การชำระเงิน & มัดจำ' และ 'ห้องของฉัน')

    ตอนนี้ยึดจาก ocr_data.user_id == current_user.id
    ถ้าอนาคตมี mapping อื่น (tenant_id ฯลฯ) ค่อยปรับ query ตรงนี้
    """
    stmt = (
        select(Contract)
        .where(Contract.ocr_data["user_id"].astext == str(current_user.id))
        .order_by(desc(Contract.id))
    )

    contract = session.exec(stmt).first()
    if not contract:
        raise HTTPException(status_code=404, detail="ยังไม่มีสัญญาในระบบสำหรับผู้ใช้นี้")

    return MyContractResponse(
        contract_id=contract.id,
        room_id=contract.room_id,
        deposit_status=contract.deposit_status,
        deposit_amount=contract.deposit_amount,
        contract_pdf_url=contract.contract_pdf_url,
        deposit_slip_url=contract.deposit_slip_url,
    )
