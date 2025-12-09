# backend/app/models/tenant.py
from typing import Optional
from sqlmodel import SQLModel, Field

class Tenant(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    first_name: str
    last_name: str
    phone: str
    email: Optional[str] = None
    id_card_number: str = Field(unique=True, index=True)
    status: str = Field(default="active")