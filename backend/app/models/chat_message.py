from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class ChatMessage(SQLModel, table=True):
    __tablename__ = "chat_messages"

    id: Optional[int] = Field(default=None, primary_key=True)

    tenant_id: int = Field(index=True)
    sender_role: str = Field(index=True)  # "tenant" | "admin" | "ai"
    sender_user_id: Optional[int] = Field(default=None, index=True)

    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
