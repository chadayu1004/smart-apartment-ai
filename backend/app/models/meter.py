# app/models/meter.py
from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Optional

from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import ENUM as PgEnum


# ---------- Enum ให้ตรงกับ type ใน PostgreSQL ----------
class MeterType(str, Enum):
    water = "water"
    electric = "electric"


class MeterStatus(str, Enum):
    active = "active"         # ใช้งานอยู่
    maintenance = "maintenance"  # ปรับปรุง/ซ่อม
    inactive = "inactive"     # ไม่ได้ใช้งาน


class Meter(SQLModel, table=True):
    """
    ตาราง meter ตามฐานข้อมูลที่มีอยู่:
    id, meter_code, meter_type, room_id, image_url,
    location_note, status, installed_at, removed_at,
    created_at, updated_at
    """

    __tablename__ = "meter"  # ถ้าชื่อ table จริงไม่ใช่ meter ให้แก้ตรงนี้

    id: Optional[int] = Field(default=None, primary_key=True)

    meter_code: str = Field(
        max_length=50,
        index=True,
        description="รหัสตัวเครื่องวัด เช่น W-A201-01 หรือ E-A201-01",
    )

    # map ไปยัง enum ชื่อ meter_type ใน PostgreSQL (มีอยู่แล้วจึงใช้ create_type=False)
    meter_type: MeterType = Field(
        sa_column=Column(PgEnum(MeterType, name="meter_type", create_type=False))
    )

    room_id: int = Field(
        foreign_key="room.id",  # ถ้า room table ชื่ออื่นให้แก้ foreign key นี้
        index=True,
        description="ห้องที่ติดตั้งมิเตอร์",
    )

    image_url: Optional[str] = Field(
        default=None,
        description="URL รูปมิเตอร์ เช่น /media/meters/xxxx.jpg",
    )

    location_note: Optional[str] = Field(
        default=None,
        description="โน้ตตำแหน่งติดตั้ง เช่น หน้าห้อง / ระเบียง / ห้องน้ำ",
    )

    status: MeterStatus = Field(
        sa_column=Column(PgEnum(MeterStatus, name="meter_status", create_type=False)),
        description="สถานะมิเตอร์",
    )

    installed_at: Optional[date] = Field(
        default=None, description="วันที่ติดตั้ง"
    )
    removed_at: Optional[date] = Field(
        default=None, description="วันที่เลิกใช้งาน (ถ้ามี)"
    )

    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        nullable=False,
        description="วันที่สร้าง record",
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        nullable=False,
        description="วันที่แก้ไขล่าสุด",
    )
