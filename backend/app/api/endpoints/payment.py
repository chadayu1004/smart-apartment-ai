# backend/app/api/endpoints/payment.py

from fastapi import (
    APIRouter,
    Depends,
    UploadFile,
    File,
    Form,
    HTTPException,
)
from sqlmodel import Session, select
from typing import Optional, List
from datetime import datetime
import os
import uuid

from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_   # ✅ ใช้สำหรับค้นจากหลายเงื่อนไข

from app.core.database import get_session
from app.models.user import User
from app.models.tenant import Tenant
from app.models.contract import Contract
from app.models.payment import Payment
from app.models.notification import Notification
from app.api.endpoints.auth import get_current_user

# ถ้ามี model Room อยู่ให้ import ด้วย (ถ้าไม่มี สามารถลบบรรทัดนี้ทิ้งได้)
try:
    from app.models.room import Room
except Exception:
    Room = None  # กัน error เวลา import

router = APIRouter()


# ------------------------------------------------------------------
# Pydantic schema สำหรับส่งข้อมูลให้ฝั่ง Admin ใช้งาน
# ------------------------------------------------------------------
class AdminPaymentOut(BaseModel):
    payment_id: int
    tenant_name: str
    payer_name: str
    amount_paid: float
    payment_status: str
    created_at: datetime
    contract_id: int
    room_no: Optional[int] = None
    slip_image_url: Optional[str] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------
# GET /payments/admin – รายการชำระเงินทั้งหมด (สำหรับผู้ดูแล)
# ---------------------------------------------------------
@router.get("/admin", response_model=List[AdminPaymentOut])
def list_all_payments_for_admin(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # ตรวจสิทธิ์ admin
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="เฉพาะผู้ดูแลเท่านั้น")

    stmt = (
        select(Payment, Tenant, Contract)
        .join(Tenant, Tenant.id == Payment.tenant_id)
        .join(Contract, Contract.id == Payment.contract_id)
        .order_by(Payment.created_at.desc())
    )
    rows = session.exec(stmt).all()

    results: List[AdminPaymentOut] = []
    for payment, tenant, contract in rows:
        results.append(
            AdminPaymentOut(
                payment_id=payment.payment_id,
                tenant_name=f"{tenant.first_name} {tenant.last_name or ''}".strip(),
                payer_name=payment.payer_name,
                amount_paid=float(payment.amount_paid),
                payment_status=payment.payment_status,
                created_at=payment.created_at,
                contract_id=contract.id,
                room_no=getattr(contract, "room_id", None),
                slip_image_url=payment.slip_image_url,
            )
        )
    return results


# ---------------------------------------------------------
# Helper: หา / สร้าง tenant จาก current_user แบบอัตโนมัติ
#   - ค้นจากทั้ง email และ id_card_number (ถ้ามี)
#   - ถ้าเจอแล้วจะอัปเดต field ที่ขาด เช่น email / id_card_number / phone
# ---------------------------------------------------------
def get_or_create_tenant_for_user(session: Session, user: User) -> Tenant:
    """
    หา Tenant ของ user ปัจจุบัน:
      1) ใช้ email และ/หรือ id_card_number เป็นเงื่อนไขค้นหา
      2) ถ้าเจอ → อัปเดตข้อมูลให้ครบ
      3) ถ้าไม่เจอ → สร้างใหม่
    """

    conditions = []

    # ใช้ email เป็น key แรก
    if getattr(user, "email", None):
        conditions.append(Tenant.email == user.email)

    # ถ้ามีเลขบัตรใน model User ด้วย ก็ใช้เป็น key อีกตัว
    user_id_card = getattr(user, "id_card_number", None)
    if user_id_card:
        conditions.append(Tenant.id_card_number == user_id_card)

    tenant: Optional[Tenant] = None

    if conditions:
        stmt = select(Tenant).where(or_(*conditions))
        tenant = session.exec(stmt).first()

    if tenant:
        updated = False

        # sync ชื่อ / นามสกุล / เบอร์โทร
        if getattr(user, "first_name", None) and tenant.first_name != user.first_name:
            tenant.first_name = user.first_name
            updated = True

        if getattr(user, "last_name", None) and tenant.last_name != user.last_name:
            tenant.last_name = user.last_name
            updated = True

        if getattr(user, "phone", None) and tenant.phone != user.phone:
            tenant.phone = user.phone
            updated = True

        # ถ้า tenant เดิมยังไม่มี email แต่ user มี → เติมให้
        if getattr(user, "email", None) and not tenant.email:
            tenant.email = user.email
            updated = True

        # ถ้า tenant เดิมยังไม่มีเลขบัตร แต่ user มี → เติมให้
        if user_id_card and not tenant.id_card_number:
            tenant.id_card_number = user_id_card
            updated = True

        if updated:
            session.add(tenant)
            session.commit()
            session.refresh(tenant)

        return tenant

    # ---------- ถ้าไม่เจอ → สร้าง tenant ใหม่ ----------
    # คอลัมน์ id_card_number ใน DB เป็น NOT NULL ห้ามส่ง None
    id_card_value = user_id_card or ""

    tenant = Tenant(
        first_name=getattr(user, "first_name", None) or user.username,
        last_name=getattr(user, "last_name", None) or "",
        phone=getattr(user, "phone", None),
        email=getattr(user, "email", None),
        id_card_number=id_card_value,
        status="active",
    )

    try:
        session.add(tenant)
        session.commit()
        session.refresh(tenant)
    except IntegrityError as e:
        session.rollback()
        raise HTTPException(
            status_code=400,
            detail="ไม่สามารถสร้างข้อมูลผู้เช่าอัตโนมัติได้",
        ) from e

    return tenant


# ---------------------------------------------------------
# POST /payments/create – ผู้เช่าส่งสลิปให้ผู้ดูแลตรวจสอบ
# ---------------------------------------------------------
@router.post("/create")
async def create_payment(
    contractId: int = Form(...),
    bankName: str = Form(...),
    referenceNumber: str = Form(...),
    amountPaid: float = Form(...),
    payerName: str = Form(...),
    slipImage: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # ---------- 1) หา / สร้าง tenant ----------
    tenant = get_or_create_tenant_for_user(session, current_user)

    # ---------- 2) หา contract ----------
    contract: Optional[Contract] = session.get(Contract, contractId)
    if not contract:
        raise HTTPException(status_code=404, detail="ไม่พบสัญญาเช่า")

    # ผูก contract กับ tenant ถ้ายังไม่ตรง
    if contract.tenant_id is None or contract.tenant_id != tenant.id:
        contract.tenant_id = tenant.id
        session.add(contract)
        session.commit()
        session.refresh(contract)

    # ---------- 3) ตรวจไฟล์สลิป & เซฟ ----------
    ALLOWED_CONTENT_TYPES = [
        "image/jpeg",
        "image/png",
        "image/webp",
    ]

    if slipImage.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="รองรับเฉพาะไฟล์สลิป JPG / PNG / WEBP เท่านั้น",
        )

    upload_root = os.path.join("static", "uploads", "slips")
    os.makedirs(upload_root, exist_ok=True)

    _, ext = os.path.splitext(slipImage.filename or "")
    if not ext:
        ext = ".jpg"

    filename = f"{uuid.uuid4()}{ext}"
    save_path = os.path.join(upload_root, filename)

    with open(save_path, "wb") as f:
        f.write(await slipImage.read())

    slip_url = save_path.replace("\\", "/")

    # ---------- 4) บันทึก payment + อัปเดต contract.deposit_status ----------
    now = datetime.utcnow()

    payment = Payment(
        tenant_id=tenant.id,
        contract_id=contract.id,
        bank_name=bankName.strip(),
        reference_number=referenceNumber.strip(),
        amount_paid=amountPaid,
        payer_name=payerName.strip(),
        payment_status="pending",  # รอผู้ดูแลตรวจสอบ
        slip_image_url=slip_url,
        created_at=now,
        updated_at=now,
    )
    session.add(payment)

    # สถานะสัญญา: ผู้เช่าส่งสลิปแล้ว กำลังรอตรวจสอบ
    contract.deposit_status = "pending_review"
    contract.deposit_slip_url = slip_url
    contract.deposit_paid_at = now
    session.add(contract)

    # ---------- 5) Notification สำหรับ admin ----------
    try:
        # TODO: หากมี admin หลายคน อาจเปลี่ยน logic ให้ส่งถึงทุก admin
        ADMIN_USER_ID = 1

        notif = Notification(
            user_id=ADMIN_USER_ID,
            title="มีการส่งหลักฐานการชำระเงินใหม่",
            message=(
                f"ผู้เช่า {tenant.first_name} {tenant.last_name or ''} "
                f"ส่งหลักฐานการชำระเงิน สัญญา #{contract.id} "
                f"จำนวน {amountPaid:.2f} บาท"
            ),
            type="payment",
            is_read=False,
            data={"contract_id": contract.id, "amount": float(amountPaid)},
            created_at=now,
            updated_at=now,
        )
        session.add(notif)
    except Exception:
        # กันไม่ให้ล้มทั้ง endpoint ถ้า model notification มีปัญหา
        pass

    # ---------- 6) commit ----------
    session.commit()
    session.refresh(payment)

    payment_id = getattr(payment, "payment_id", getattr(payment, "id", None))

    return {
        "status": "success",
        "message": "บันทึกข้อมูลการชำระเงินและแจ้งเตือนผู้ดูแลเรียบร้อยแล้ว",
        "payment_id": payment_id,
        "tenant_id": tenant.id,
        "contract_id": contract.id,
        "slip_url": slip_url,
    }


# ---------------------------------------------------------
# POST /payments/{payment_id}/approve – อนุมัติการชำระเงิน (สำหรับผู้ดูแล)
#   (อย่าลืมให้ frontend ใช้ api.post(`/payments/${id}/approve`) )
# ---------------------------------------------------------
@router.post("/{payment_id}/approve", response_model=AdminPaymentOut)
def approve_payment(
    payment_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="เฉพาะผู้ดูแลเท่านั้น")

    payment: Optional[Payment] = session.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลการชำระเงิน")

    now = datetime.utcnow()
    payment.payment_status = "approved"
    payment.updated_at = now
    session.add(payment)

    # อัปเดตสัญญาให้เป็นชำระมัดจำแล้ว
    contract: Optional[Contract] = session.get(Contract, payment.contract_id)
    if contract:
        contract.deposit_status = "paid"
        contract.deposit_paid_at = now
        if payment.slip_image_url:
            contract.deposit_slip_url = payment.slip_image_url
        session.add(contract)

        # ถ้ามี model Room และอยากเปลี่ยนสถานะห้อง
        if Room is not None and contract.room_id:
            room = session.get(Room, contract.room_id)
            if room:
                room.status = "occupied"  # ตั้งตามที่ใช้จริงในระบบ
                session.add(room)

    session.commit()

    # โหลด tenant & contract อีกครั้งเพื่อใช้ออก response
    tenant: Optional[Tenant] = session.get(Tenant, payment.tenant_id)
    contract = session.get(Contract, payment.contract_id)

    return AdminPaymentOut(
        payment_id=payment.payment_id,
        tenant_name=f"{tenant.first_name} {tenant.last_name or ''}".strip()
        if tenant
        else "",
        payer_name=payment.payer_name,
        amount_paid=float(payment.amount_paid),
        payment_status=payment.payment_status,
        created_at=payment.created_at,
        contract_id=payment.contract_id,
        room_no=contract.room_id if contract else None,
        slip_image_url=payment.slip_image_url,
    )


# ---------------------------------------------------------
# GET /payments/my – ประวัติการชำระเงินของผู้ใช้ปัจจุบัน
# ---------------------------------------------------------
@router.get("/my")
def list_my_payments(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    tenant = get_or_create_tenant_for_user(session, current_user)

    stmt = (
        select(Payment)
        .where(Payment.tenant_id == tenant.id)
        .order_by(Payment.created_at.desc())
    )
    payments = session.exec(stmt).all()

    return [
        {
            "payment_id": getattr(p, "payment_id", getattr(p, "id", None)),
            "contract_id": p.contract_id,
            "bank_name": p.bank_name,
            "reference_number": p.reference_number,
            "amount_paid": float(p.amount_paid),
            "payer_name": p.payer_name,
            "payment_status": p.payment_status,
            "slip_image_url": p.slip_image_url,
            "created_at": p.created_at,
        }
        for p in payments
    ]
