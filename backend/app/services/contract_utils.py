# backend/app/services/contract_utils.py
from datetime import date
from sqlmodel import Session, select

from app.models.contract import Contract
from app.services.doc_codes import CONTRACT_PREFIXES


def generate_contract_no(session: Session, contract_type_key: str, doc_date: date) -> str:
    """
    สร้างเลขที่สัญญาแบบ [PREFIX]-[YYYY][MM][DD]-[RUNNO4]

    contract_type_key:
        "deposit"  -> DEP
        "rent"     -> CTR
        "renew"    -> CTR-REN
        "cancel"   -> CTR-CXL
    """
    if contract_type_key not in CONTRACT_PREFIXES:
        raise ValueError(f"Unknown contract_type_key: {contract_type_key}")

    prefix = CONTRACT_PREFIXES[contract_type_key]
    date_str = doc_date.strftime("%Y%m%d")

    like_pattern = f"{prefix}-{date_str}-%"

    # หาเลข run ตัวล่าสุดของวันนั้น ๆ (ตาม prefix เดียวกัน)
    last_no = session.exec(
        select(Contract.contract_no)
        .where(Contract.contract_no.like(like_pattern))
        .order_by(Contract.contract_no.desc())
        .limit(1)
    ).first()

    if last_no:
        try:
            last_run = int(last_no.split("-")[-1])
        except ValueError:
            last_run = 0
    else:
        last_run = 0

    new_run = last_run + 1
    run_str = f"{new_run:04d}"

    return f"{prefix}-{date_str}-{run_str}"
