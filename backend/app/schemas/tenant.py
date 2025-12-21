# backend/app/schemas/tenant.py
from __future__ import annotations

from typing import Optional
from pydantic import BaseModel


class TenantBase(BaseModel):
    first_name: str
    last_name: str
    phone: str
    email: Optional[str] = None
    id_card_number: str
    status: str = "active"


class TenantCreate(TenantBase):
    pass


class TenantRead(TenantBase):
    id: int

    class Config:
        from_attributes = True  # ✅ Pydantic v2
