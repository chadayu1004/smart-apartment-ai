# backend/app/models/contract.py
from typing import Optional, Dict, Any
from datetime import date, datetime

from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB


class Contract(SQLModel, table=True):
    """
    ตารางสัญญาเช่า / มัดจำ / ต่อสัญญา ฯลฯ

    contract_no ใช้รูปแบบ:
      [PREFIX]-[YYYY][MM][DD]-[RUNNO]
    เช่น:
      DEP-20251204-0003   (สัญญามัดจำ)
      CTR-20250115-0008   (สัญญาเช่าหลัก)
    """

    id: Optional[int] = Field(default=None, primary_key=True)

    # เลขที่สัญญาทางการ เช่น DEP-20251204-0003
    contract_no: Optional[str] = Field(
        default=None,
        index=True,
        max_length=32,
        description="เลขที่สัญญา [PREFIX]-YYYYMMDD-RUNNO",
    )

    # ผูกกับผู้เช่าและห้อง
    tenant_id: int = Field(index=True)
    room_id: int = Field(index=True)

    # ประเภทสัญญา: deposit, rent, extension, cancel ฯลฯ
    contract_type: str = Field(default="deposit", index=True)

    # ระยะเวลาเช่า / หรือช่วงเวลาของสัญญามัดจำ
    start_date: date
    end_date: Optional[date] = None  # <-- ใช้ Optional เพื่อรองรับสัญญามัดจำ

    # ค่าเช่าต่อเดือน
    monthly_rent: float

    # ------------------ ส่วนของ "มัดจำ" ------------------
    deposit_amount: float = Field(default=0)

    # pending = ยังไม่จ่าย, paid = จ่ายแล้ว, overdue = เกินกำหนด
    deposit_status: str = Field(default="pending", index=True)

    deposit_due_date: Optional[date] = None

    # วันที่–เวลาที่ชำระมัดจำจริง
    deposit_paid_at: Optional[datetime] = None

    # แนบหลักฐานการชำระเงิน (สลิป)
    deposit_slip_url: Optional[str] = Field(
        default=None,
        max_length=255,
        description="path รูป/ไฟล์หลักฐานการชำระเงิน",
    )

    # ------------------ ไฟล์สัญญา / OCR ------------------
    id_image_url: Optional[str] = Field(
        default=None,
        max_length=255,
        description="relative URL ของรูปบัตรประชาชน/Passport",
    )

    # เนื้อหาสัญญาใช้สร้าง PDF
    contract_text: Optional[str] = Field(
        default=None,
        description="ข้อความสัญญาฉบับเต็มที่ใช้สร้าง PDF",
    )

    # path PDF สัญญา
    contract_pdf_url: Optional[str] = Field(
        default=None,
        max_length=255,
        description="relative URL ของไฟล์สัญญา PDF",
    )

    # JSONB เก็บข้อมูล OCR / AI / booking linkage
    ocr_data: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSONB),
    )

    # สถานะสัญญาโดยรวม
    status: str = Field(default="active", index=True)

    # timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
