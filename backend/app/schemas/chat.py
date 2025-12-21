from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class ChatMessageOut(BaseModel):
    id: int
    tenant_id: int
    sender_role: str
    sender_user_id: Optional[int] = None
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatMessagesPageOut(BaseModel):
    items: List[ChatMessageOut]
    has_more: bool
    next_before_created_at: Optional[str] = None
    next_before_id: Optional[int] = None


# WebSocket payloads
class WSOutgoing(BaseModel):
    content: str


class WSPresence(BaseModel):
    type: str = "presence"
    admin_active: bool


class WSMessageEvent(BaseModel):
    type: str = "message"
    id: int
    tenant_id: int
    sender_role: str
    sender_user_id: Optional[int] = None
    content: str
    created_at: str
