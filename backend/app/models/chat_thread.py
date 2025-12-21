from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class ChatThread(SQLModel, table=True):
    __tablename__ = "chat_threads"

    id: Optional[int] = Field(default=None, primary_key=True)

    tenant_id: int = Field(index=True, unique=True)

    # True = AI ตอบได้ (เมื่อ admin ไม่ active)
    ai_enabled: bool = Field(default=True)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
