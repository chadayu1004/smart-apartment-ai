# backend/app/models/calendar_event.py
from enum import Enum
from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class CalendarVisibility(str, Enum):
    ADMIN_ONLY = "ADMIN_ONLY"
    TENANT_PUBLIC = "TENANT_PUBLIC"
    TENANT_PRIVATE = "TENANT_PRIVATE"


class CalendarEvent(SQLModel, table=True):
    __tablename__ = "calendar_events"

    id: Optional[int] = Field(default=None, primary_key=True)

    title: str
    description: Optional[str] = None

    start: datetime
    end: Optional[datetime] = None
    all_day: bool = False

    color: Optional[str] = "#1976d2"

    visibility: CalendarVisibility = Field(default=CalendarVisibility.ADMIN_ONLY)

    tenant_id: Optional[int] = None
    created_by_user_id: int

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
