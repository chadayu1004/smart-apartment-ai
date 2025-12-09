# backend/app/services/payment_service.py

from app.models.payment import Payment
from app.models.tenant import Tenant
from app.models.contract import Contract
from sqlmodel import Session, select
from datetime import datetime

def save_payment(
    tenant_id: int,
    contract_id: int,
    bank_name: str,
    reference_number: str,
    amount_paid: float,
    payer_name: str,
    slip_image_url: str,
    session: Session
):
    # ตรวจสอบว่าผู้เช่ามีอยู่ในระบบ
    tenant = session.get(Tenant, tenant_id)
    if not tenant:
        raise ValueError("ไม่พบข้อมูลผู้เช่า")

    # ตรวจสอบว่ามีสัญญาในระบบ
    contract = session.get(Contract, contract_id)
    if not contract:
        raise ValueError("ไม่พบข้อมูลสัญญา")

    # บันทึกข้อมูลการชำระเงิน
    payment = Payment(
        tenant_id=tenant_id,
        contract_id=contract_id,
        bank_name=bank_name,
        reference_number=reference_number,
        amount_paid=amount_paid,
        payer_name=payer_name,
        slip_image_url=slip_image_url,
        payment_status="pending",  # เริ่มต้นสถานะเป็น pending
    )

    session.add(payment)
    session.commit()

    return payment
