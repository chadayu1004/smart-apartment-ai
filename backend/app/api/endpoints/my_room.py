# backend/app/api/endpoints/my_room.py
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from sqlalchemy import cast, Integer

from app.core.database import get_session
from app.models.user import User
from app.models.booking import BookingRequest
from app.models.contract import Contract
from app.models.tenant import Tenant
from app.api.endpoints.auth import get_current_user

# ถ้ามี Room model
try:
    from app.models.room import Room
except Exception:
    Room = None

router = APIRouter()


# ------------------------------------------------------------------
# ใช้กับหน้า "ห้องของฉัน"  → รวมทั้ง Room + Contract
# ------------------------------------------------------------------
class MyRoomOut(BaseModel):
    room_id: int
    building: Optional[str] = None
    floor: Optional[int] = None
    status: Optional[str] = None

    contract_id: int
    deposit_status: str
    deposit_amount: float
    contract_pdf_url: Optional[str] = None

    class Config:
        from_attributes = True


def _get_tenant_by_email(session: Session, user: User) -> Tenant:
    """
    ดึง tenant จาก email ของ user
    **ไม่สร้างใหม่** เพื่อไม่ให้ข้อมูลซ้ำ
    """
    tenant = session.exec(
        select(Tenant).where(Tenant.email == user.email)
    ).first()

    if not tenant:
        raise HTTPException(
            status_code=404,
            detail="ยังไม่พบข้อมูลผู้เช่าที่ผูกกับบัญชีของคุณ",
        )
    return tenant


@router.get("", response_model=MyRoomOut)
def get_my_room(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    ใช้ในหน้าเมนู 'ห้องของฉัน'
    ดึง:
      - ห้องที่ผูกกับสัญญาล่าสุดของผู้ใช้
      - ข้อมูลสัญญา (สถานะมัดจำ, ยอดมัดจำ, contract_pdf_url)
    """

    tenant = _get_tenant_by_email(session, current_user)

    # หา contract ล่าสุดที่ผูกกับ tenant นี้ และมัดจำถูกชำระแล้ว
    # (ถ้าอยากให้ดึงทุกสัญญา ให้ตัดเงื่อนไข deposit_status ออก)
    stmt = (
        select(Contract, Room)
        .join(Room, Room.id == Contract.room_id)  # ถ้า Room ไม่มี ให้ลบบรรทัดนี้
        .where(
            Contract.tenant_id == tenant.id,
            Contract.deposit_status == "paid",
        )
        .order_by(Contract.created_at.desc())
    )

    row = session.exec(stmt).first()
    if not row:
        raise HTTPException(
            status_code=404,
            detail="ยังไม่พบสัญญาเช่าที่ผูกกับบัญชีของคุณ",
        )

    if Room is not None:
        contract, room = row
    else:
        # กรณีไม่มี Room model จริง ๆ
        contract, room = row[0], None

    return MyRoomOut(
        room_id=getattr(room, "id", contract.room_id),
        building=getattr(room, "building", None),
        floor=getattr(room, "floor", None),
        status=getattr(room, "status", None),
        contract_id=contract.id,
        deposit_status=contract.deposit_status,
        deposit_amount=contract.deposit_amount,
        contract_pdf_url=contract.contract_pdf_url,
    )


# ------------------------------------------------------------------
# (ของเดิม) /my-room/deposit  – เอาไว้ใช้ที่อื่นต่อก็ได้
# ------------------------------------------------------------------
class DepositStatus(str):
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"


class DepositInfo(BaseModel):
    contract_id: int
    room_id: int
    deposit_status: str
    deposit_due_date: Optional[str] = None
    deposit_amount: float
    contract_pdf_url: Optional[str] = None


@router.get("/deposit", response_model=DepositInfo)
def get_deposit_info(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    ดึงข้อมูลสัญญามัดจำล่าสุดของผู้ใช้คนปัจจุบัน (ใช้กับ notification / banner ได้)
    """

    booking = session.exec(
        select(BookingRequest)
        .where(
            BookingRequest.user_id == current_user.id,
            BookingRequest.status == "approved",
        )
        .order_by(BookingRequest.created_at.desc())
    ).first()

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="ยังไม่พบสัญญามัดจำสำหรับผู้ใช้คนนี้",
        )

    contract = session.exec(
        select(Contract)
        .where(
            cast(Contract.ocr_data["booking_id"].astext, Integer) == booking.id,
            Contract.contract_type == "deposit",
        )
        .order_by(Contract.id.desc())
    ).first()

    if not contract:
        raise HTTPException(
            status_code=404,
            detail="ยังไม่พบสัญญามัดจำสำหรับคำขอจองนี้",
        )

    return DepositInfo(
        contract_id=contract.id,
        room_id=contract.room_id,
        deposit_status=contract.deposit_status,
        deposit_due_date=contract.deposit_due_date.isoformat()
        if contract.deposit_due_date
        else None,
        deposit_amount=contract.deposit_amount,
        contract_pdf_url=contract.contract_pdf_url,
    )
