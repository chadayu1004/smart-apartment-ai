# backend/app/api/endpoints/auth.py
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    UploadFile,
    File,
    Form,
    BackgroundTasks,
)
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlmodel import Session, select, or_
from pydantic import BaseModel, EmailStr
from jose import jwt, JWTError
from typing import Optional
from datetime import datetime, timedelta
import random
import shutil
import uuid
import os

# --- Library ส่ง Email ---
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType

# --- Library ส่ง SMS (Twilio) ---
from twilio.rest import Client

from app.core.database import get_session
from app.models.user import User
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    SECRET_KEY,
    ALGORITHM,
)

# =========================================================
# Router + OAuth2 config
# =========================================================
router = APIRouter()
# tokenUrl ต้องชี้ไป path จริงของ login (รวม prefix ที่ main.py ใส่ให้)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# =========================================================
# ⚙️ ตั้งค่า EMAIL (Gmail SMTP)
# =========================================================
MAIL_USERNAME = "YOUR_GMAIL@gmail.com"
MAIL_PASSWORD = "YOUR_APP_PASSWORD"  # App Password ของ Gmail
MAIL_FROM = MAIL_USERNAME
MAIL_PORT = 587
MAIL_SERVER = "smtp.gmail.com"

mail_conf = ConnectionConfig(
    MAIL_USERNAME=MAIL_USERNAME,
    MAIL_PASSWORD=MAIL_PASSWORD,
    MAIL_FROM=MAIL_FROM,
    MAIL_PORT=MAIL_PORT,
    MAIL_SERVER=MAIL_SERVER,
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
)

# =========================================================
# ⚙️ ตั้งค่า SMS (Twilio)
# =========================================================
TWILIO_ACCOUNT_SID = "YOUR_TWILIO_ACCOUNT_SID"
TWILIO_AUTH_TOKEN = "YOUR_TWILIO_AUTH_TOKEN"
TWILIO_PHONE_NUMBER = "+18667249915"  # เบอร์จาก Twilio (sender)
# =========================================================

# --- Schemas ---
class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user_role: str
    user_name: str
    profile_image: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: str  # รับได้ทั้ง email หรือเบอร์ (เราจะใช้ OR ตอน query)


class ResetPasswordRequest(BaseModel):
    email: str  # รับได้ทั้ง email หรือเบอร์
    code: str
    new_password: str


# =========================================================
# Helper: ส่ง Email OTP
# =========================================================
async def send_email_otp(email_to: str, otp_code: str):
    try:
        message = MessageSchema(
            subject="รหัสยืนยัน (OTP) - Smart Apartment",
            recipients=[email_to],
            body=f"""
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #2c3e50;">รหัสกู้คืนรหัสผ่าน</h2>
                <p>คุณได้ทำการร้องขอรหัสผ่านใหม่ รหัสยืนยันของคุณคือ:</p>
                <h1 style="color: #1976d2; letter-spacing: 5px;">{otp_code}</h1>
                <p style="color: #7f8c8d; font-size: 12px;">รหัสนี้จะหมดอายุใน 15 นาที ห้ามบอกรหัสนี้แก่ผู้อื่น</p>
            </div>
            """,
            subtype=MessageType.html,
        )
        fm = FastMail(mail_conf)
        await fm.send_message(message)
        print(f"✅ Email sent to {email_to}")
    except Exception as e:
        print(f"❌ Email Error: {e}")


# =========================================================
# Helper: ส่ง SMS OTP
# =========================================================
def send_sms_otp(to_phone: str, otp_code: str):
    try:
        # แปลงเบอร์ 08x เป็น +668x
        formatted_phone = to_phone.strip()
        if formatted_phone.startswith("0"):
            formatted_phone = "+66" + formatted_phone[1:]

        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        message = client.messages.create(
            body=f"Smart Apartment OTP: {otp_code} (Expires in 15 mins)",
            from_=TWILIO_PHONE_NUMBER,
            to=formatted_phone,
        )
        print(f"✅ SMS sent to {formatted_phone}: {message.sid}")
        return True
    except Exception as e:
        print(f"❌ SMS Error: {e}")
        return False


# =========================================================
# 1. Register
# =========================================================
@router.post("/register", response_model=User)
def register(user_in: UserRegister, session: Session = Depends(get_session)):
    # กันข้อมูลซ้ำ: email, username, phone
    existing_user = session.exec(
        select(User).where(
            or_(
                User.email == user_in.email,
                User.username == user_in.username,
                User.phone == user_in.phone,
            )
        )
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="ข้อมูลผู้ใช้ซ้ำในระบบ (Email, Username หรือ Phone)",
        )

    new_user = User(
        username=user_in.username,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        phone=user_in.phone,
        role="user",
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return new_user


# =========================================================
# 2. Login  ✅ FIX: ใช้ user.id เป็น sub
# =========================================================
@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    login_input = form_data.username

    # หา user จาก email หรือ username หรือ phone
    user = session.exec(
        select(User).where(
            or_(
                User.email == login_input,
                User.username == login_input,
                User.phone == login_input,
            )
        )
    ).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Login failed",
        )

    # ✅ ใช้ id เป็น sub เสมอ (เสถียร)
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "role": user.role,
            "email": user.email or "",
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_role": user.role,
        "user_name": user.first_name,
        "profile_image": user.profile_image,
    }


# =========================================================
# 3. Dependency: get_current_user  ✅ ต้อง decode id จาก sub
# =========================================================
def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: Optional[str] = payload.get("sub")
        if user_id_str is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="token ไม่มีข้อมูลผู้ใช้ (sub)",
            )
        try:
            user_id = int(user_id_str)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="token ไม่ถูกต้อง (sub ไม่ใช่ตัวเลข)",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ไม่สามารถยืนยันตัวตนได้",
        )

    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ไม่พบผู้ใช้ในระบบ",
        )
    return user


# =========================================================
# 4. Update Profile
# =========================================================
@router.patch("/me", response_model=User)
async def update_profile(
    first_name: str = Form(None),
    last_name: str = Form(None),
    file: UploadFile = File(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if first_name:
        current_user.first_name = first_name
    if last_name:
        current_user.last_name = last_name

    if file:
        upload_dir = "static/uploads"
        os.makedirs(upload_dir, exist_ok=True)

        file_ext = file.filename.split(".")[-1] if file.filename else "jpg"
        file_name = f"{uuid.uuid4()}.{file_ext}"

        dest_path = os.path.join(upload_dir, file_name)
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # เก็บเป็น URL (frontend ใช้แสดงรูป)
        current_user.profile_image = f"http://127.0.0.1:8000/static/uploads/{file_name}"

    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user


# =========================================================
# 5. Forgot Password (ส่ง Email + SMS)
# =========================================================
@router.post("/forgot-password")
async def forgot_password(
    req: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    # ค้นหาจาก Email หรือ Phone
    user = session.exec(
        select(User).where(
            or_(User.email == req.email, User.phone == req.email)
        )
    ).first()

    # เพื่อไม่ให้หลุดข้อมูลว่า email นี้มี / ไม่มี ในระบบ
    if not user:
        return {"message": "หากข้อมูลถูกต้อง เราได้ส่งรหัสยืนยันไปให้แล้ว"}

    otp = f"{random.randint(100000, 999999)}"
    user.reset_code = otp
    user.reset_code_expires_at = datetime.now() + timedelta(minutes=15)
    session.add(user)
    session.commit()

    print(f"🔑 [DEBUG] OTP for {user.first_name}: {otp}")

    # 1) ส่ง Email
    if user.email:
        background_tasks.add_task(send_email_otp, user.email, otp)

    # 2) ส่ง SMS
    if user.phone:
        background_tasks.add_task(send_sms_otp, user.phone, otp)

    return {"message": "กำลังส่งรหัสยืนยันไปที่ Email และ SMS ของคุณ"}


# =========================================================
# 6. Reset Password
# =========================================================
@router.post("/reset-password")
def reset_password(
    req: ResetPasswordRequest,
    session: Session = Depends(get_session),
):
    user = session.exec(
        select(User).where(
            or_(User.email == req.email, User.phone == req.email)
        )
    ).first()

    if not user or user.reset_code != req.code:
        raise HTTPException(
            status_code=400,
            detail="รหัสยืนยันไม่ถูกต้อง",
        )

    if user.reset_code_expires_at is None or user.reset_code_expires_at < datetime.now():
        raise HTTPException(
            status_code=400,
            detail="รหัสหมดอายุ",
        )

    user.password_hash = get_password_hash(req.new_password)
    user.reset_code = None
    user.reset_code_expires_at = None

    session.add(user)
    session.commit()

    return {"message": "เปลี่ยนรหัสผ่านสำเร็จ"}


# =========================================================
# ✅ Compat Layer (เพิ่มใหม่): ให้ import เก่าใช้ได้
# - ไม่กระทบ logic เก่า เพราะ "เรียก jwt.decode แบบเดียวกับ get_current_user"
# =========================================================

def _extract_bearer(token_or_bearer: Optional[str]) -> Optional[str]:
    if not token_or_bearer:
        return None
    v = token_or_bearer.strip()
    if v.lower().startswith("bearer "):
        return v.split(" ", 1)[1].strip()
    return v


def get_user_from_token(token: str, session: Session) -> User:
    """
    ✅ รองรับ code เก่าที่เรียก get_user_from_token(token, session)
    """
    token = _extract_bearer(token) or ""
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: Optional[str] = payload.get("sub")
        if not user_id_str:
            raise HTTPException(status_code=401, detail="token ไม่มีข้อมูลผู้ใช้ (sub)")
        user_id = int(user_id_str)
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def get_user_from_ws_token(websocket, session: Session) -> User:
    """
    ✅ ให้ chat.py import ได้: get_user_from_ws_token(websocket, session)
    - token จาก query (?token=xxx)
    - หรือจาก header Authorization
    """
    token = None

    # ws.query_params / ws.headers (ใช้ได้กับ starlette WebSocket)
    try:
        token = _extract_bearer(websocket.query_params.get("token"))
    except Exception:
        token = None

    if not token:
        try:
            token = _extract_bearer(websocket.headers.get("authorization"))
        except Exception:
            token = None

    if not token:
        raise HTTPException(status_code=401, detail="Missing token")

    return get_user_from_token(token, session)
