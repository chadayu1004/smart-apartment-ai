# backend/app/models/tenant.py
from __future__ import annotations
from typing import Optional
from sqlmodel import SQLModel, Field

class Tenant(SQLModel, table=True):
    __tablename__ = "tenant"
    id: Optional[int] = Field(default=None, primary_key=True)
    first_name: str
    last_name: str
    phone: str = Field(index=True)
    email: Optional[str] = Field(default=None, index=True)
    id_card_number: str = Field(index=True, unique=True)
    status: str = Field(default="active", index=True)
