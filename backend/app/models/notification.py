# backend/app/models/notification.py
from typing import Optional, Dict, Any
from datetime import datetime

from sqlmodel import SQLModel, Field, Column, JSON


class Notification(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    user_id: int = Field(index=True)          # ผู้รับแจ้งเตือน (ผูกกับตาราง user)
    title: str                                # หัวข้อสั้น ๆ
    message: str                              # ข้อความหลัก
    type: str = Field(default="general")      # เช่น 'deposit_due', 'system', ...
    is_read: bool = Field(default=False)      # อ่านแล้วหรือยัง

    # ข้อมูลเสริม (เช่น contract_id, room_id)
    data: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON),
    )

    created_at: datetime = Field(default_factory=datetime.utcnow)
