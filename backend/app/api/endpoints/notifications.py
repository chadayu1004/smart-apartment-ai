from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from sqlalchemy import func  # 👈 เพิ่ม
from pydantic import BaseModel

from app.core.database import get_session
from app.models.notification import Notification
from app.models.user import User
from app.api.endpoints.auth import get_current_user

router = APIRouter()


# --------- response model ---------
class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    type: str
    is_read: bool
    data: dict | None = None  # กันกรณี data เป็น NULL

    class Config:
        from_attributes = True  # แทน orm_mode


class UnreadCountResponse(BaseModel):
    unread_count: int


# --------- 1) ดึงรายการแจ้งเตือนของ user ปัจจุบัน ---------
@router.get("/me", response_model=List[NotificationOut])
def get_my_notifications(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    stmt = (
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
    )
    notifs = session.exec(stmt).all()
    return notifs


# --------- 2) ดึงจำนวนแจ้งเตือนที่ยังไม่อ่าน (ใช้กับกระดิ่ง) ---------
@router.get("/me/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # ใช้ SELECT COUNT(*) ให้ชัด ๆ
    stmt = select(func.count(Notification.id)).where(
        Notification.user_id == current_user.id,
        Notification.is_read == False,  # noqa: E712
    )
    unread_count = session.exec(stmt).one()  # ได้ค่า int อย่างเดียว
    return UnreadCountResponse(unread_count=unread_count)


# --------- 3) mark แจ้งเตือนตัวเดียว เป็นอ่านแล้ว ---------
@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    notif = session.get(Notification, notification_id)
    if not notif or notif.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="ไม่พบแจ้งเตือน")

    if not notif.is_read:
        notif.is_read = True
        session.add(notif)
        session.commit()

    return {"message": "อัปเดตสถานะอ่านแล้ว"}


# --------- 4) mark แจ้งเตือนทั้งหมดเป็นอ่านแล้ว ---------
@router.post("/read-all")
def mark_all_read(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Notification).where(
        Notification.user_id == current_user.id,
        Notification.is_read == False,  # noqa: E712
    )
    notifs = session.exec(stmt).all()

    updated = 0
    for n in notifs:
        n.is_read = True
        session.add(n)
        updated += 1

    session.commit()
    return {"message": "อัปเดตแจ้งเตือนทั้งหมดเป็นอ่านแล้ว", "updated": updated}
