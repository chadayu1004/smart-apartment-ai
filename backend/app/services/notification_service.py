# backend/app/services/notification_service.py
from app.models.notification import Notification
from app.models.user import User
from datetime import datetime

def create_payment_notification(
    payment_id: int,
    tenant_id: int,
    session: Session
):
    tenant = session.get(User, tenant_id)
    if not tenant:
        raise ValueError("ไม่พบข้อมูลผู้เช่า")

    notification = Notification(
        user_id=tenant_id,
        title="การชำระเงินใหม่",
        message=f"ผู้เช่ามีการชำระเงินจำนวน {payment_id}",
        type="payment_due",
        is_read=False,
        data={"payment_id": payment_id},
    )
    session.add(notification)
    session.commit()
