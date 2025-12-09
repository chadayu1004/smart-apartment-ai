# backend/app/models/booking.py (ฉบับแก้ไขสมบูรณ์)
from typing import Optional
from datetime import date, datetime
from sqlmodel import SQLModel, Field


class BookingRequest(SQLModel, table=True):
    # ให้แน่ใจว่าชื่อตารางตรงกับใน Postgres (bookingrequest)
    __tablename__ = "bookingrequest"

    id: Optional[int] = Field(default=None, primary_key=True)

    room_id: int = Field(index=True)

    # บางเคส user_id อาจว่างได้ (เช่น ให้แอดมินจองให้)
    user_id: Optional[int] = Field(
        default=None,
        index=True,
        foreign_key="user.id",
    )

    # ข้อมูลผู้จอง (จะถูกโอนไปเป็น Tenant)
    first_name: str
    last_name: str
    phone: str
    id_card_number: str

    # ข้อมูลสำหรับสร้างสัญญา (Contract Info)
    lease_start_date: date
    lease_term_months: int = Field(default=12)  # ระยะสัญญา (เดือน)
    agreed_monthly_rent: float
    deposit_amount: float

    # ✅ path รูปบัตรที่อัปโหลด (/media/id_cards/xxx.jpg)
    id_image_url: Optional[str] = Field(
        default=None,
        description="relative URL ของรูปบัตร เช่น /media/id_cards/xxxx.jpg",
        max_length=255,
    )

    # ผลการตรวจจาก AI
    # ในโค้ด backend มีค่า: pending, pass, fail, warning, error
    ai_status: str = Field(default="pending")  # pending, pass, fail, warning, error
    ai_confidence: float = Field(default=0.0)
    ai_remark: Optional[str] = None

    # สถานะการอนุมัติ
    status: str = Field(default="pending")  # pending, approved, rejected

    # ใช้ UTC จะปลอดภัยกว่า
    created_at: datetime = Field(default_factory=datetime.utcnow)
