# app/api/endpoints/meters.py

import os
import uuid
from datetime import date, datetime
from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from sqlmodel import Session, select

from app.core.database import get_session
from app.models.user import User
from app.api.endpoints.auth import get_current_user

from app.models.meter import Meter, MeterType, MeterStatus

router = APIRouter()


# ---------- Pydantic Schemas ----------

from pydantic import BaseModel


class MeterOut(BaseModel):
    id: int
    meter_code: str
    meter_type: MeterType
    room_id: int
    image_url: Optional[str] = None
    location_note: Optional[str] = None
    status: MeterStatus
    installed_at: Optional[date] = None
    removed_at: Optional[date] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ---------- Helper สำหรับเซฟรูป ----------
def save_meter_image(file: UploadFile) -> str:
    """
    เซฟรูปลงโฟลเดอร์ media/meters และคืนค่า URL สำหรับเก็บใน DB
    เช่น /media/meters/<uuid>.jpg
    """
    # รองรับเฉพาะรูปภาพ
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(
            status_code=400,
            detail="รองรับเฉพาะไฟล์รูปภาพ JPG / PNG / WEBP เท่านั้น",
        )

    # โฟลเดอร์จริงในเครื่อง
    upload_root = os.path.join("media", "meters")
    os.makedirs(upload_root, exist_ok=True)

    # สร้างชื่อไฟล์ใหม่
    _, ext = os.path.splitext(file.filename or "")
    if not ext:
        # fallback เป็น .jpg ถ้าไม่มีนามสกุล
        ext = ".jpg"

    filename = f"{uuid.uuid4()}{ext}"
    save_path = os.path.join(upload_root, filename)

    # เขียนไฟล์
    with open(save_path, "wb") as f:
        f.write(file.file.read())

    # URL ที่ให้ frontend เรียก (สอดคล้องกับ app.mount("/media", ...))
    public_url = f"/media/meters/{filename}"
    return public_url


# =========================================================
# GET /meters/   (ลิสต์ + ฟิลเตอร์)
# =========================================================
@router.get("/", response_model=List[MeterOut])
def list_meters(
    meter_type: Optional[MeterType] = None,
    status: Optional[MeterStatus] = None,
    room_id: Optional[int] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    ลิสต์มิเตอร์ทั้งหมด (เฉพาะ admin)
    รองรับ query filter:
      - ?meter_type=water / electric
      - ?status=active / maintenance / inactive
      - ?room_id=1
    """

    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="เฉพาะผู้ดูแลเท่านั้น")

    stmt = select(Meter)

    if meter_type is not None:
        stmt = stmt.where(Meter.meter_type == meter_type)

    if status is not None:
        stmt = stmt.where(Meter.status == status)

    if room_id is not None:
        stmt = stmt.where(Meter.room_id == room_id)

    stmt = stmt.order_by(Meter.created_at.desc())

    meters = session.exec(stmt).all()
    return meters


# =========================================================
# POST /meters/   (เพิ่มมิเตอร์ + รูป)
# =========================================================
@router.post("/", response_model=MeterOut)
async def create_meter(
    meter_code: str = Form(...),
    meter_type: MeterType = Form(...),
    room_id: int = Form(...),
    status: MeterStatus = Form(MeterStatus.active),
    location_note: Optional[str] = Form(None),
    installed_at: Optional[date] = Form(None),
    removed_at: Optional[date] = Form(None),
    image: Optional[UploadFile] = File(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    สร้างมิเตอร์ใหม่
    - รองรับอัปโหลดรูป (field: image)
    - เก็บ path รูปใน image_url เป็น /media/meters/xxxx.jpg
    """

    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="เฉพาะผู้ดูแลเท่านั้น")

    # กัน code ซ้ำในระบบ (optional)
    existing = session.exec(
        select(Meter).where(Meter.meter_code == meter_code)
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="รหัสมิเตอร์นี้ถูกใช้งานแล้ว",
        )

    image_url: Optional[str] = None
    if image is not None:
        image_url = save_meter_image(image)

    now = datetime.utcnow()

    meter = Meter(
        meter_code=meter_code.strip(),
        meter_type=meter_type,
        room_id=room_id,
        image_url=image_url,
        location_note=(location_note or "").strip() or None,
        status=status,
        installed_at=installed_at,
        removed_at=removed_at,
        created_at=now,
        updated_at=now,
    )

    session.add(meter)
    session.commit()
    session.refresh(meter)

    return meter
