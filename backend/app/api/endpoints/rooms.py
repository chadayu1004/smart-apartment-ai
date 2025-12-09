# backend/app/api/endpoints/rooms.py
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlmodel import Session, select
from typing import List, Optional
import shutil
import uuid
import os
import json

from app.core.database import get_session
from app.models.room import Room
from app.models.user import User
from app.api.endpoints.auth import get_current_user

router = APIRouter()

UPLOAD_DIR = "static/uploads/rooms"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# -------------------------------
# 1) GET /rooms  (Public + Admin)
# -------------------------------
@router.get("/", response_model=List[Room])
def get_rooms(session: Session = Depends(get_session)):
    rooms = session.exec(select(Room).order_by(Room.room_number)).all()
    return rooms


# ---------------------------------
# 2) POST /rooms  (Admin Only)
# ---------------------------------
@router.post("/", response_model=Room, status_code=status.HTTP_201_CREATED)
async def create_room(
    room_number: str = Form(...),
    building: str = Form(...),
    floor: int = Form(...),
    room_type: str = Form(...),
    price: float = Form(...),

    # JSON เช่น ["แอร์","Wifi"]
    amenities: str = Form("[]"),

    promotion: Optional[str] = Form(None),
    description: Optional[str] = Form(None),

    file: UploadFile = File(...),  # รูป
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):

    # -----------------------
    # ✨ Admin check
    # -----------------------
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="ต้องเป็นผู้ดูแลระบบเท่านั้น")

    # -----------------------
    # ✨ เช็คเลขห้องซ้ำ
    # -----------------------
    exist_room = session.exec(
        select(Room).where(Room.room_number == room_number)
    ).first()

    if exist_room:
        raise HTTPException(status_code=400, detail="เลขห้องนี้ถูกใช้งานแล้ว")

    # -----------------------
    # ✨ เซฟรูปภาพ
    # -----------------------
    ext = file.filename.split(".")[-1].lower()
    if ext not in ["jpg", "jpeg", "png", "webp"]:
        raise HTTPException(400, "รูปต้องเป็น jpg/jpeg/png/webp เท่านั้น")

    file_name = f"{uuid.uuid4()}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, file_name)

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    image_url = f"/static/uploads/rooms/{file_name}"

    # -----------------------
    # ✨ แปลง amenities JSON
    # -----------------------
    try:
        amenities_list = json.loads(amenities)
    except:
        amenities_list = []

    # -----------------------
    # ✨ สร้างห้องใหม่
    # -----------------------
    new_room = Room(
        room_number=room_number,
        building=building,
        floor=floor,
        room_type=room_type,
        price=price,

        amenities=amenities_list,
        promotion=promotion,
        description=description,

        image_url=image_url,
        status="available",
    )

    session.add(new_room)
    session.commit()
    session.refresh(new_room)
    return new_room


# ---------------------------------
# 3) DELETE /rooms/{id}  (Admin Only)
# ---------------------------------
@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_room(
    room_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):

    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    room = session.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # ลบไฟล์รูปออกจากดิสก์
    if room.image_url:
        rel_path = room.image_url.lstrip("/")
        if os.path.exists(rel_path):
            try:
                os.remove(rel_path)
            except:
                pass  # ไม่ต้อง error ถ้าลบไม่ได้

    session.delete(room)
    session.commit()
    return
