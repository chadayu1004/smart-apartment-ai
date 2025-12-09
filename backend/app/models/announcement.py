# app/models/announcement.py
from datetime import datetime

from sqlalchemy import Column, String, Text, DateTime, Boolean, func
from sqlmodel import SQLModel, Field


class Announcement(SQLModel, table=True):
    # ชื่อ table ใน DB
    __tablename__ = "announcements"

    # ====== คอลัมน์หลัก ======
    id: int | None = Field(default=None, primary_key=True, index=True)

    # ใช้ sa_column เพื่อกำหนด String(255), nullable=False
    title: str = Field(
        sa_column=Column("title", String(255), nullable=False)
    )

    content: str = Field(
        sa_column=Column(Text, nullable=False)
    )

    is_active: bool = Field(
        default=True,
        sa_column=Column(Boolean, nullable=False, server_default="1"),
    )

    created_at: datetime | None = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
        ),
    )

    updated_at: datetime | None = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            onupdate=func.now(),
        ),
    )
