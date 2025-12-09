from pydantic import BaseModel
from typing import Optional

# Base Schema (ข้อมูลพื้นฐาน)
class TenantBase(BaseModel):
    first_name: str
    last_name: str
    phone: str
    id_card_number: str
    status: str = "active"

# Schema สำหรับตอนสร้าง (Request)
class TenantCreate(TenantBase):
    pass

# Schema สำหรับตอนตอบกลับ (Response) - จะมี ID ด้วย
class TenantRead(TenantBase):
    id: int

    class Config:
        from_attributes = True