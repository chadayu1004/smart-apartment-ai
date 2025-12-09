# backend/app/schemas/booking.py
from pydantic import BaseModel

class BookingCreate(BaseModel):
    room_id: int
    first_name: str
    last_name: str
    phone: str
    id_card_number: str
    # เราไม่รับ ai_status จากหน้าเว็บ (Backend จะเป็นคนตรวจเองเพื่อความปลอดภัย)