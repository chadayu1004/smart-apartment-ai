# backend/create_admin.py
from sqlmodel import Session, select
from app.core.database import engine
from app.models.user import User
from app.core.security import get_password_hash

def create_super_admin():
    with Session(engine) as session:
        # เช็คก่อนว่ามี admin หรือยัง
        existing_admin = session.exec(select(User).where(User.email == "admin@smartapt.com")).first()
        if existing_admin:
            print("Admin already exists!")
            return

        # สร้าง Admin
        admin_user = User(
            username="admin",
            email="admin@smartapt.com",
            password_hash=get_password_hash("admin1234"), # รหัสผ่าน
            first_name="Super",
            last_name="Admin",
            role="admin" # <--- สำคัญตรงนี้
        )
        
        session.add(admin_user)
        session.commit()
        print("✅ Created Admin User: admin@smartapt.com / admin1234")

if __name__ == "__main__":
    create_super_admin()