from __future__ import annotations
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field

# โมเดลฐานข้อมูลสำหรับการชำระเงิน
class PaymentBase(SQLModel):
    tenant_id: int = Field(foreign_key="tenant.id")  # ฟิลด์ tenant_id อ้างอิงจากตาราง tenant
    contract_id: int = Field(foreign_key="contract.id")  # ฟิลด์ contract_id อ้างอิงจากตาราง contract

    bank_name: str = Field(max_length=255)  # ชื่อธนาคาร
    reference_number: str = Field(max_length=255)  # เลขที่อ้างอิง
    amount_paid: float  # จำนวนเงินที่ชำระ
    payer_name: str = Field(max_length=255)  # ชื่อผู้โอน

    # สถานะการชำระเงิน: pending, approved, rejected
    payment_status: str = Field(max_length=50, default="pending")  # ค่าเริ่มต้นเป็น pending

    slip_image_url: Optional[str] = Field(default=None, max_length=255)  # URL ของสลิปการชำระเงิน

    created_at: datetime = Field(default_factory=datetime.utcnow)  # เวลาที่บันทึกข้อมูลการชำระเงิน
    updated_at: datetime = Field(default_factory=datetime.utcnow)  # เวลาที่อัปเดตข้อมูลล่าสุด

# โมเดลหลักสำหรับการบันทึกการชำระเงิน
class Payment(PaymentBase, table=True):
    __tablename__ = "payment"  # ชื่อตารางในฐานข้อมูล

    payment_id: Optional[int] = Field(default=None, primary_key=True)  # รหัสการชำระเงิน
