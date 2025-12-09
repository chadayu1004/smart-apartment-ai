# backend/app/services/document_number.py
from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from sqlmodel import Session, select
from sqlalchemy import desc

from app.models.contract import Contract

# --- type ช่วยจำแนกหมวด ---
ContractType = Literal["deposit", "rent", "extension", "cancel"]
BillingType = Literal["INV", "INV-WTR", "INV-ELC", "INV-RNT", "INV-FULL"]
ReceiptType = Literal["RCPT", "RCPT-DEP", "RCPT-RNT"]
MaintenanceType = Literal["MTN", "MTN-DONE"]


# ---------- 1) Contract number ----------

def get_contract_prefix(contract_type: ContractType) -> str:
    """
    map contract_type -> prefix ตามที่คุณกำหนด
    """
    if contract_type == "deposit":
        return "DEP"        # Deposit Contract
    if contract_type == "rent":
        return "CTR"        # Contract
    if contract_type == "extension":
        return "CTR-REN"    # Contract – Renewal
    if contract_type == "cancel":
        return "CTR-CXL"    # Cancel Contract
    # default กันเหนียว
    return "CTR"


def generate_contract_number(
    session: Session,
    contract_type: Optional[ContractType] = None,
    *,
    doc_type: Optional[ContractType] = None,
) -> str:
    """
    สร้างเลขที่สัญญาตาม format:
      [PREFIX]-[YYYY][MM][DD]-[RUNNO]

    เช่น:
      DEP-20251204-0003

    พารามิเตอร์:
    - contract_type: ใช้แบบ positional/keyword เดิม
    - doc_type:      ใช้แบบใหม่ เช่น generate_contract_number(session, doc_type="deposit")

    ลำดับความสำคัญ: doc_type > contract_type > "deposit"
    """
    # รองรับทั้งแบบเก่าและแบบใหม่
    ct: ContractType = (doc_type or contract_type or "deposit")  # type: ignore[arg-type]

    prefix = get_contract_prefix(ct)
    today_str = datetime.now().strftime("%Y%m%d")
    base = f"{prefix}-{today_str}-"  # เช่น DEP-20251204-

    # ดึงตัวที่ contract_no ขึ้นต้นด้วย base ล่าสุด
    stmt = (
        select(Contract.contract_no)
        .where(Contract.contract_no.like(f"{base}%"))
        .order_by(desc(Contract.contract_no))
        .limit(1)
    )

    last_no = session.exec(stmt).first()

    if not last_no:
        run_no = 1
    else:
        # ตัด 4 ตัวท้ายเป็นเลข RUNNO
        try:
            run_no = int(last_no[-4:]) + 1
        except Exception:
            # ถ้า parse ไม่ได้ เริ่มใหม่ที่ 1
            run_no = 1

    return f"{base}{run_no:04d}"  # zero pad 4 หลัก
