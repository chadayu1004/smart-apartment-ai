# backend/app/models/user.py
from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    password_hash: str  # ห้ามเก็บรหัสผ่านจริง เก็บเฉพาะ Hash
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: str = "user"
    profile_image: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    reset_code: Optional[str] = None
    reset_code_expires_at: Optional[datetime] = None