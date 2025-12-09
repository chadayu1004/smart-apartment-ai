# app/schemas/announcement.py
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class AnnouncementBase(BaseModel):
    title: str
    content: str

class AnnouncementCreate(AnnouncementBase):
    pass

class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    is_active: Optional[bool] = None

class AnnouncementOut(AnnouncementBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
