# backend/app/schemas/calendar_event.py
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class CalendarVisibility(str, Enum):
    ADMIN_ONLY = "ADMIN_ONLY"
    TENANT_PRIVATE = "TENANT_PRIVATE"
    TENANT_PUBLIC = "TENANT_PUBLIC"


class CalendarEventBase(BaseModel):
    title: str = Field(..., max_length=255)
    description: Optional[str] = None

    start: datetime
    end: Optional[datetime] = None

    all_day: bool = True
    color: Optional[str] = None

    visibility: CalendarVisibility = CalendarVisibility.ADMIN_ONLY

    # ใช้กับ TENANT_PRIVATE / filter ฝั่ง tenant
    tenant_id: Optional[int] = None


class CalendarEventCreate(CalendarEventBase):
    pass


class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start: Optional[datetime] = None
    end: Optional[datetime] = None
    all_day: Optional[bool] = None
    color: Optional[str] = None
    visibility: Optional[CalendarVisibility] = None
    tenant_id: Optional[int] = None


class CalendarEventRead(CalendarEventBase):
    id: int
    created_by_user_id: int
    created_at: datetime
    updated_at: datetime

    # ✅ Pydantic v2
    model_config = {"from_attributes": True}
