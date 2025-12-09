# backend/app/api/endpoints/bookings.py
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlmodel import Session, select
from typing import List
from datetime import date, timedelta
import os
import io
import re
import uuid
import traceback  # 👈 เพิ่มไว้ log error

from pydantic import BaseModel

from app.core.database import get_session
from app.models.booking import BookingRequest
from app.models.room import Room
from app.models.tenant import Tenant
from app.models.contract import Contract
from app.models.user import User
from app.api.endpoints.auth import get_current_user
from app.services.contract_pdf import generate_contract_pdf  # ใช้สร้างไฟล์ PDF
from app.models.notification import Notification
from app.services.document_number import generate_contract_number  # ✅ gen เลขที่สัญญา

import pytesseract
from PIL import Image, ImageEnhance, ImageFilter

# ตั้งค่า Path Tesseract (ตรวจสอบให้ตรงกับเครื่องของคุณ)
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

router = APIRouter()


# ==================== Helpers ====================

def verify_thai_id(id_card: str) -> bool:
    """ตรวจสอบเลขบัตรประชาชน 13 หลักด้วยสูตร check digit"""
    if len(id_card) != 13 or not id_card.isdigit():
        return False
    s = 0
    for i in range(12):
        s += int(id_card[i]) * (13 - i)
    check = (11 - (s % 11)) % 10
    return check == int(id_card[12])


def similarity_score(a: str, b: str) -> float:
    """
    วัดความเหมือนของเลข 2 ชุดแบบง่าย ๆ:
    - ถ้าความยาวไม่เท่ากัน ให้ 0 ทันที
    - ถ้าความยาวเท่ากัน นับตำแหน่งที่ตรงกัน / ความยาว * 100
    """
    if len(a) != len(b):
        return 0.0
    match = sum(1 for i in range(len(a)) if a[i] == b[i])
    return (match / len(a)) * 100.0


def save_id_image(file: UploadFile, contents: bytes) -> str:
    """
    เซฟรูปบัตรลงโฟลเดอร์ media/id_cards แล้วคืนค่าเป็น relative URL
    ตัวอย่าง: /media/id_cards/id_1234567890abcd.jpg

    โฟลเดอร์ media ถูก mount แล้วที่ main.py:
        app.mount("/media", StaticFiles(directory="media"), name="media")
    """
    media_dir = os.path.join("media", "id_cards")
    os.makedirs(media_dir, exist_ok=True)

    # เอาเฉพาะนามสกุลไฟล์ (default เป็น .jpg)
    ext = os.path.splitext(file.filename or "")[1] or ".jpg"
    filename = f"id_{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(media_dir, filename)

    with open(file_path, "wb") as f:
        f.write(contents)

    return f"/media/id_cards/{filename}"


# ==================== 1. Submit Booking ====================

@router.post("/submit", response_model=BookingRequest)
async def submit_booking(
    room_id: int = Form(...),
    first_name: str = Form(...),
    last_name: str = Form(...),
    phone: str = Form(...),
    id_card_number: str = Form(...),
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # ✅ ตรวจสอบเลขบัตร 13 หลักเบื้องต้น
    if not verify_thai_id(id_card_number):
        raise HTTPException(status_code=400, detail="เลขบัตรประชาชนไม่ถูกต้อง")

    # 1) ข้อมูลห้อง / ราคา
    room = session.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # ✅ กันจองห้องที่ไม่ว่าง
    if room.status in ("reserved", "occupied"):
        raise HTTPException(
            status_code=400,
            detail="ห้องนี้ถูกจองหรือมีผู้เช่าอยู่แล้ว",
        )

    current_price = room.price

    # ✅ ล็อกสถานะห้องทันทีเมื่อมีการจอง
    room.status = "reserved"
    session.add(room)

    # 2) อ่านไฟล์รูปบัตร + เซฟลง disk
    contents = await file.read()
    id_image_url = save_id_image(file, contents)

    # 3) ให้ AI อ่านรูป
    ai_status = "pending"
    ai_confidence = 0.0
    ai_remark = ""

    try:
        image = Image.open(io.BytesIO(contents))

        # Pre-processing
        image = image.convert("L")  # ขาวดำ
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(2.0)
        image = image.filter(ImageFilter.SHARPEN)

        text = pytesseract.image_to_string(
            image,
            lang="tha+eng",
            config=r"--oem 3 --psm 6",
        )

        # --- Clean text ---
        cleaned_text = (
            text.replace("l", "1")
            .replace("I", "1")
            .replace("O", "0")
            .replace("o", "0")
            .replace("B", "8")
            .replace("S", "5")
        )
        all_digits = re.sub(r"\D", "", cleaned_text)

        # candidate 13 หลักทั้งหมด
        candidates = re.findall(r"\d{13}", all_digits)
        # กรองเฉพาะที่ผ่าน check digit
        valid_numbers = [c for c in candidates if verify_thai_id(c)]

        if not valid_numbers:
            ai_status = "fail"
            ai_confidence = 20.0
            ai_remark = "AI ไม่พบเลขบัตรประชาชนในภาพ หรือภาพไม่ชัด"
        else:
            ai_detected = valid_numbers[0]
            score = similarity_score(id_card_number, ai_detected)

            if score >= 95:
                ai_status = "pass"
                ai_confidence = score
                ai_remark = "AI อ่านเลขตรงกับเลขที่กรอก"
            elif score >= 70:
                ai_status = "warning"
                ai_confidence = score
                ai_remark = f"AI อ่านเลขใกล้เคียง ({ai_detected}) โปรดตรวจสอบอีกครั้ง"
            else:
                ai_status = "fail"
                ai_confidence = score
                ai_remark = f"AI อ่านเลขไม่ตรง ({ai_detected})"

    except Exception as e:
        # ถ้า AI พัง ให้เก็บสถานะ error แต่ยังคงบันทึก booking + รูปบัตร
        ai_status = "error"
        ai_confidence = 0.0
        ai_remark = f"AI Error: {str(e)}"

    # 4) บันทึกลง DB (ตรงนี้จะรันเสมอ ไม่ว่า AI จะสำเร็จหรือ error)
    booking = BookingRequest(
        room_id=room_id,
        user_id=current_user.id,
        first_name=first_name,
        last_name=last_name,
        phone=phone,
        id_card_number=id_card_number,
        lease_start_date=date.today(),
        lease_term_months=12,
        agreed_monthly_rent=current_price,
        deposit_amount=current_price * 2,
        ai_status=ai_status,
        ai_confidence=ai_confidence,
        ai_remark=ai_remark,
        status="pending",
        id_image_url=id_image_url,  # ทำให้คอลัมน์ไม่เป็น NULL
    )

    session.add(booking)
    session.commit()
    session.refresh(booking)
    return booking


# ==================== 2. List Bookings ====================

@router.get("/", response_model=List[BookingRequest])
def get_bookings(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # ✅ ให้เฉพาะ role admin/staff ดูได้ (กัน tenant / user ทั่วไป)
    if current_user.role not in ("admin", "staff"):
        raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์ดูรายการจอง")

    # เรียงจากรายการล่าสุดไปเก่าสุด
    return session.exec(
        select(BookingRequest).order_by(BookingRequest.id.desc())
    ).all()


# ==================== 3. Approve (รับ contract_text จาก Admin) ====================

class ApproveBookingPayload(BaseModel):
    contract_text: str  # เนื้อหาสัญญาที่ Admin แก้ไขแล้ว


@router.post("/{booking_id}/approve")
def approve_booking(
    booking_id: int,
    payload: ApproveBookingPayload,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    print(">>> Approve booking called", booking_id)

    try:
        # ---------- ตรวจสิทธิ์ ----------
        if current_user.role not in ("admin", "staff"):
            raise HTTPException(
                status_code=403,
                detail="ไม่มีสิทธิ์อนุมัติคำขอจอง",
            )

        booking = session.get(BookingRequest, booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")

        if booking.status != "pending":
            raise HTTPException(
                status_code=400,
                detail="รายการนี้ถูกดำเนินการไปแล้ว",
            )

        # ---------- A. สร้าง/อัปเดต Tenant ----------
        existing_tenant = session.exec(
            select(Tenant).where(Tenant.id_card_number == booking.id_card_number)
        ).first()

        if existing_tenant:
            tenant_id = existing_tenant.id
            existing_tenant.phone = booking.phone
            session.add(existing_tenant)
            tenant_obj = existing_tenant
        else:
            new_tenant = Tenant(
                first_name=booking.first_name,
                last_name=booking.last_name,
                phone=booking.phone,
                id_card_number=booking.id_card_number,
                status="active",
            )
            session.add(new_tenant)
            session.flush()
            tenant_id = new_tenant.id
            tenant_obj = new_tenant

        # ---------- B. เตรียมข้อมูลสัญญามัดจำ ----------
        lease_start = booking.lease_start_date or date.today()
        lease_term = booking.lease_term_months or 12

        end_date = lease_start + timedelta(days=30 * lease_term)
        deposit_due = lease_start + timedelta(days=7)

        monthly_rent = float(booking.agreed_monthly_rent or 0)
        deposit_amount = float(booking.deposit_amount or 0)

        # ✅ สร้างเลขที่สัญญาอย่างเป็นทางการ: DEP-YYYYMMDD-RUNNO
        contract_no = generate_contract_number(session, doc_type="deposit")
        print(">>> GENERATED CONTRACT NO =", contract_no)

        # ---------- C. สร้าง "สัญญามัดจำ" ----------
        new_contract = Contract(
            tenant_id=tenant_id,
            room_id=booking.room_id,
            contract_type="deposit",  # ระบุว่าเป็นสัญญามัดจำ
            contract_no=contract_no,
            start_date=lease_start,
            end_date=end_date,
            monthly_rent=monthly_rent,
            # ---- ข้อมูลมัดจำ ----
            deposit_amount=deposit_amount,
            deposit_status="pending",
            deposit_due_date=deposit_due,
            # แนบ path รูปบัตรจากคำขอจอง
            id_image_url=booking.id_image_url,
            # เนื้อหาสัญญาที่ Admin แก้ไขแล้ว
            contract_text=payload.contract_text,
            # ---- เก็บข้อมูล OCR / AI เพิ่มเติมใน JSONB ----
            ocr_data={
                "source": "booking_approval",
                "booking_id": booking.id,
                "ai_score": booking.ai_confidence,
                "ai_status": booking.ai_status,
                "id_card_number": booking.id_card_number,
                "user_id": booking.user_id,
                "contract_no": contract_no,
            },
            status="active",
        )
        session.add(new_contract)
        session.flush()  # ให้ได้ new_contract.id ก่อนใช้สร้าง PDF

        # ---------- D. สร้างไฟล์ PDF สัญญามัดจำ ----------
        id_image_path = None
        if booking.id_image_url:
            id_image_path = os.path.join(".", booking.id_image_url.lstrip("/"))

        contract_pdf_url = generate_contract_pdf(
            contract_id=new_contract.id,
            tenant=tenant_obj,
            booking=booking,
            id_image_path=id_image_path,
            contract_text=payload.contract_text,
            contract_no=contract_no,
        )

        new_contract.contract_pdf_url = contract_pdf_url
        session.add(new_contract)

        # ---------- E. เปลี่ยน role user เป็น tenant ----------
        if booking.user_id:
            user = session.get(User, booking.user_id)
            if user:
                user.role = "tenant"
                session.add(user)

        # ✅ F. อัปเดตสถานะห้อง → occupied (มีผู้เช่าแล้ว)
        room = session.get(Room, booking.room_id)
        if room:
            room.status = "occupied"
            session.add(room)

        # ---------- G. อัปเดตสถานะ booking ----------
        booking.status = "approved"
        session.add(booking)

        # ---------- H. สร้างแจ้งเตือนให้ผู้ใช้ไปชำระมัดจำ ----------
        if booking.user_id:
            notif = Notification(
                user_id=booking.user_id,
                title="แจ้งเตือนชำระเงินมัดจำ",
                message=(
                    f"กรุณาชำระมัดจำห้อง {booking.room_id} "
                    f"จำนวน {deposit_amount:,.2f} บาท "
                    f"ภายในวันที่ {deposit_due.strftime('%d/%m/%Y')}"
                ),
                type="deposit_due",
                data={
                    "contract_id": new_contract.id,
                    "room_id": booking.room_id,
                    "deposit_due_date": deposit_due.isoformat(),
                    "contract_pdf_url": contract_pdf_url,
                    "contract_no": contract_no,
                },
            )
            session.add(notif)

        # ---------- I. commit ครั้งเดียว ----------
        session.commit()

        return {
            "message": (
                "อนุมัติสำเร็จ! "
                "ผู้ใช้ถูกอัปเกรดเป็นผู้เช่า พร้อมสร้างสัญญามัดจำ เลขที่สัญญา "
                f"{contract_no} และไฟล์ PDF แล้ว"
            )
        }

    except HTTPException:
        # ถ้าเป็น HTTPException เดิม ให้โยนต่อ
        raise
    except Exception as e:
        # log stacktrace ใน terminal
        traceback.print_exc()
        session.rollback()
        # ส่ง detail กลับให้ frontend เห็น ไม่ใช่ Unknown Error
        raise HTTPException(
            status_code=500,
            detail=f"Approve booking failed: {str(e)}",
        )


# ==================== 4. Reject ====================

@router.post("/{booking_id}/reject")
def reject_booking(
    booking_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # ✅ เฉพาะ admin/staff เท่านั้นที่ reject ได้
    if current_user.role not in ("admin", "staff"):
        raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์ปฏิเสธคำขอจอง")

    booking = session.get(BookingRequest, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status != "pending":
        raise HTTPException(status_code=400, detail="รายการนี้ถูกดำเนินการไปแล้ว")

    booking.status = "rejected"
    session.add(booking)

    # ✅ ปล่อยสถานะห้องกลับไปเป็น available ถ้าก่อนหน้านี้ reserved อยู่
    room = session.get(Room, booking.room_id)
    if room and room.status == "reserved":
        room.status = "available"
        session.add(room)

    session.commit()

    return {"message": "ปฏิเสธคำขอจองเรียบร้อยแล้ว"}
