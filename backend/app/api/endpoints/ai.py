# backend/app/api/endpoints/ai.py
from fastapi import APIRouter, UploadFile, File, HTTPException
import pytesseract
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import io
import re

# ถ้าจะรองรับ PDF จริง ๆ แนะนำติดตั้ง pdf2image แล้ว uncomment ส่วนด้านล่าง
try:
    from pdf2image import convert_from_bytes  # type: ignore
    PDF2IMAGE_AVAILABLE = True
except Exception:
    PDF2IMAGE_AVAILABLE = False

# -------------------------------
# ตั้งค่า Path Tesseract OCR
# -------------------------------
pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)

router = APIRouter()


# ---------------------------------------------------
# ฟังก์ชันตรวจสอบเลขบัตรประชาชน (อย่าลบ / อย่าแก้)
# ---------------------------------------------------
def verify_thai_id(id_card: str) -> bool:
    """
    ตรวจสอบความถูกต้องของเลขบัตรประชาชนไทย (13 หลัก + Check Digit)
    """
    if len(id_card) != 13:
        return False

    if not id_card.isdigit():
        return False

    total = 0
    for i in range(12):
        total += int(id_card[i]) * (13 - i)

    check = (11 - (total % 11)) % 10
    return check == int(id_card[12])


# ===================================================
#                1) OCR บัตรประชาชน
# ===================================================
@router.post("/ocr/id-card")
async def scan_id_card(file: UploadFile = File(...)):
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="Invalid file type")

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))

        # ---------- 1. PRE-PROCESSING ----------
        image = image.convert("L")
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(2.5)
        image = image.filter(ImageFilter.SHARPEN)

        # ---------- 2. OCR ด้วย Tesseract ----------
        custom_config = r"--oem 3 --psm 3"
        text = pytesseract.image_to_string(
            image, lang="tha+eng", config=custom_config
        )

        # ---------- 3. ดึงชื่อจากข้อความ ----------
        thai_first_name = None
        thai_last_name = None
        eng_first_name = None
        eng_last_name = None

        m_th = re.search(
            r"(นาย|นางสาว|นาง|เด็กชาย|เด็กหญิง)\s*([ก-๙]+)\s+([ก-๙]+)", text
        )
        if m_th:
            thai_first_name = m_th.group(2)
            thai_last_name = m_th.group(3)

        m_en = re.search(
            r"(Mr\.?|Mrs\.?|Miss)\s+([A-Z][a-zA-Z]+)\s+([A-Z][a-zA-Z]+)", text
        )
        if m_en:
            eng_first_name = m_en.group(2)
            eng_last_name = m_en.group(3)

        # ---------- 4. หาเลขบัตร / เลข Passport ----------
        cleaned_text = (
            text.replace("l", "1")
            .replace("I", "1")
            .replace("O", "0")
            .replace("o", "0")
            .replace("B", "8")
            .replace("S", "5")
        )

        digits_only = re.sub(r"\D", "", cleaned_text)

        detected_id = None
        id_type = None  # thai_id / passport / None

        # 4.1 Slide หา 13 หลัก ที่ผ่านสูตรบัตรประชาชน
        found_ids = []
        if len(digits_only) >= 13:
            for i in range(len(digits_only) - 12):
                candidate = digits_only[i : i + 13]
                if verify_thai_id(candidate):
                    found_ids.append(candidate)

        if found_ids:
            detected_id = found_ids[0]
            id_type = "thai_id"

        # 4.2 รูปแบบ 1 1234 12345 12 1 (มีเว้นวรรค)
        if not detected_id:
            regex_matches = re.findall(
                r"\d\s?\d{4}\s?\d{5}\s?\d{2}\s?\d", text
            )
            for match in regex_matches:
                clean_match = match.replace(" ", "")
                if verify_thai_id(clean_match):
                    detected_id = clean_match
                    id_type = "thai_id"
                    break

        # 4.3 ถ้าไม่ใช่บัตรประชาชน ลองหาเลข Passport (ตัวอักษร+ตัวเลข 7–9 ตัว)
        if not detected_id:
            m_pass = re.search(r"\b[A-Z0-9]{7,9}\b", text)
            if m_pass:
                detected_id = m_pass.group(0)
                id_type = "passport"

        return {
            "status": "success",
            "filename": file.filename,
            "detected_id_card": detected_id,
            "id_type": id_type,
            "thai_first_name": thai_first_name,
            "thai_last_name": thai_last_name,
            "eng_first_name": eng_first_name,
            "eng_last_name": eng_last_name,
            "raw_text_preview": text[:400],
        }

    except Exception as e:
        print(f"OCR Error: {e}")
        return {
            "status": "error",
            "message": str(e),
            "detected_id_card": None,
        }


# ===================================================
#                2) OCR สลิปโอนเงิน
# ===================================================
@router.post("/ocr-slip")
async def process_slip(file: UploadFile = File(...)):
    """
    อ่านข้อมูลพื้นฐานจากสลิปโอนเงิน (เช่น Krungthai / กสิกร K+)
    คืนค่า:
      - bank_name
      - reference_number
      - amount
      - payer_name
      - transfer_datetime (string)
    """
    # ---------- 0) ตรวจชนิดไฟล์ ----------
    # รองรับ: รูปภาพ (jpeg/png/… ทุก image/*) และถ้ามี pdf2image -> PDF
    if file.content_type == "application/pdf":
        if not PDF2IMAGE_AVAILABLE:
            raise HTTPException(
                status_code=400,
                detail="เซิร์ฟเวอร์ยังไม่รองรับ PDF สำหรับสลิป (ยังไม่ได้ติดตั้ง pdf2image)",
            )
        is_pdf = True
    else:
        is_pdf = False
        if not (file.content_type or "").startswith("image/"):
            raise HTTPException(
                status_code=400,
                detail="รองรับเฉพาะไฟล์รูปภาพ (JPEG, PNG ฯลฯ) หรือ PDF สำหรับสลิปโอนเงิน",
            )

    try:
        contents = await file.read()

        # ---------- 1) แปลงไฟล์ให้เป็นภาพ PIL.Image ----------
        if is_pdf:
            # ใช้หน้าแรกของ PDF เป็นภาพ
            pages = convert_from_bytes(contents)
            if not pages:
                raise HTTPException(
                    status_code=400,
                    detail="ไม่สามารถอ่านหน้าในไฟล์ PDF ได้",
                )
            image = pages[0]
        else:
            image = Image.open(io.BytesIO(contents))

        # ---------------- 2. PRE-PROCESSING ----------------
        max_width = 1000
        if image.width < max_width:
            ratio = max_width / float(image.width)
            new_size = (int(image.width * ratio), int(image.height * ratio))
            image = image.resize(new_size, Image.LANCZOS)

        image = image.convert("L")
        image = ImageOps.autocontrast(image)
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(2.0)
        image = image.filter(ImageFilter.SHARPEN)

        # ---------------- 3. OCR ----------------
        custom_config = r"--oem 3 --psm 6"
        text = pytesseract.image_to_string(
            image, lang="tha+eng", config=custom_config
        )

        # debug
        print("=== OCR RAW TEXT (first 500) ===")
        print(text[:500])
        print("================================")

        lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
        joined_text = "\n".join(lines)

        # ---------------- 4. หา bank_name ----------------
        bank_name = None
        for ln in lines:
            if "Krungthai" in ln or "กรุงไทย" in ln:
                bank_name = "Krungthai"
                break
            if "K+" in ln or "กสิกรไทย" in ln or "KASIKORNBANK" in ln:
                bank_name = "Kasikornbank"
                break
            if "SCB" in ln or "ไทยพาณิชย์" in ln:
                bank_name = "SCB"
                break
            if "Bangkok Bank" in ln or "กรุงเทพ" in ln:
                bank_name = "Bangkok Bank"
                break

        # ---------------- 5. หา reference_number ----------------
        reference_number = None

        patterns_ref = [
            # รหัสอ้างอิง A0bef5c3f4c444fdd
            r"(รหัสอ้างอิง|รหัสอ้างอิงธนาคาร)\s*[:：]?\s*([A-Za-z0-9]+)",
            # เลขที่รายการ 123456789012345678
            r"(เลขที่รายการ|หมายเลขรายการ)\s*[:：]?\s*([0-9]+)",
            # Ref: XXXXX
            r"(Ref\.?|Reference)\s*[:：]?\s*([A-Za-z0-9]+)",
        ]

        for pat in patterns_ref:
            m = re.search(pat, joined_text)
            if m:
                reference_number = m.group(2)
                break

        # ---------------- 6. หา amount ----------------
        amount = None

        patterns_amount = [
            r"จำนวนเงิน\s*[:：]?\s*([\d,]+(?:\.\d+)?)",
            r"จำนวน\s*[:：]?\s*([\d,]+(?:\.\d+)?)",
            r"([\d,]+(?:\.\d+)?)\s*บาท",
        ]

        for pat in patterns_amount:
            m = re.search(pat, joined_text)
            if m:
                try:
                    amount = float(m.group(1).replace(",", ""))
                    break
                except ValueError:
                    continue

        # ---------------- 7. หา payer_name (ชื่อผู้โอน) ----------------
        payer_name = None

        # 7.1 สลิป Krungthai: มีคำว่า "จาก" แล้วตามด้วยชื่อบรรทัดถัดไป
        for idx, ln in enumerate(lines):
            if ln.startswith("จาก") or ln.startswith("จาก "):
                if idx + 1 < len(lines):
                    payer_name_candidate = lines[idx + 1].strip()
                    payer_name = payer_name_candidate
                break

        # 7.2 ถ้ายังไม่เจอ ลอง pattern นาย/นาง/นางสาว/คุณ
        if not payer_name:
            for ln in lines:
                m = re.search(
                    r"(นาย|นางสาว|นาง|คุณ)\s*[ก-๙ ]{2,}", ln
                )
                if m:
                    payer_name = ln.strip()
                    break

        # --------------- 8. วันที่/เวลา (ถ้าต้องใช้) ---------------
        transfer_datetime = None
        m_dt = re.search(
            r"(\d{1,2}\s*[ก-๙]+\s*\d{4}\s*[-–]\s*\d{1,2}:\d{2})", joined_text
        )
        if not m_dt:
            # ตัวอย่าง: 26 ม.ค. 65 05:10 น.
            m_dt = re.search(
                r"(\d{1,2}\s*[ก-๙]+\.*\s*\d{2,4}\s*\d{1,2}:\d{2})", joined_text
            )
        if m_dt:
            transfer_datetime = m_dt.group(1)

        # ---------------- 9. คืนค่า ----------------
        return {
            "status": "success",
            "bank_name": bank_name,
            "reference_number": reference_number,
            "amount": amount,
            "payer_name": payer_name,
            "transfer_datetime": transfer_datetime,
            "raw_text_preview": joined_text[:600],
        }

    except HTTPException:
        # ถ้าเรา raise HTTPException ด้านบนไว้แล้ว ก็โยนต่อ
        raise
    except Exception as e:
        print(f"OCR Slip Error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"ไม่สามารถประมวลผลสลิปได้: {e}",
        )
