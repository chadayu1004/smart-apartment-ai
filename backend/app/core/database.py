# backend/app/core/database.py
from sqlmodel import SQLModel, create_engine, Session

DATABASE_URL = f"postgresql://postgres:%40Dear2456@localhost:5432/apartment_db"
engine = create_engine(DATABASE_URL, echo=True)

def init_db():
    """ฟังก์ชันสำหรับสร้างตารางฐานข้อมูลทั้งหมดใน Database"""
    SQLModel.metadata.create_all(engine)

def get_session():
    """ฟังก์ชันสำหรับ Dependency Injection (ใช้กับ FastAPI Endpoints)"""
    with Session(engine) as session:
        yield session

get_db = get_session