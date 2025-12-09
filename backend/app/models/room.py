# backend/app/models/room.py
from typing import Optional, List
from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB


class Room(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    # หมายเลขห้อง ห้ามซ้ำ
    room_number: str = Field(index=True, unique=True)

    # อาคาร / ชั้น (ใส่ default ไว้ให้สร้างง่าย ๆ)
    building: str = Field(default="A")
    floor: int = Field(default=1)

    # ประเภทห้อง เช่น "Studio", "1-Bedroom"
    room_type: str

    # ราคาเช่ารายเดือน
    price: float

    # ✅ สถานะห้อง
    # available   = ว่างให้จอง
    # reserved    = มีคำขอจองแล้ว รออนุมัติ / รอมัดจำ
    # occupied    = มีผู้เช่าอยู่
    # maintenance = ปิดปรับปรุง (ถ้าอยากใช้ในอนาคต)
    status: str = Field(
        default="available",
        index=True,
        description="available / reserved / occupied / maintenance",
    )

    # สิ่งอำนวยความสะดวกภายในห้อง -> เก็บเป็น JSONB (List[str])
    amenities: List[str] = Field(
        default_factory=list,
        sa_column=Column(JSONB),
    )

    # โปรโมชัน หรือ note พิเศษของห้อง
    promotion: Optional[str] = None

    # รายละเอียดอธิบายห้อง
    description: Optional[str] = None

    # รูปห้อง (URL ไปที่ /static หรือ CDN)
    image_url: Optional[str] = None
