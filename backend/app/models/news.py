# backend/app/models/news.py
from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field

class News(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    content: str
    category: str = "general" # promotion, announcement
    created_at: datetime = Field(default_factory=datetime.now)
    is_published: bool = True