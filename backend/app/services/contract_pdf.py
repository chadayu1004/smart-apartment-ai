# backend/app/services/contract_pdf.py
import os
from datetime import datetime, timedelta
from typing import Optional
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# -------------------------------
# 1) ตั้งค่า Base Dir / Font Dir
# -------------------------------
BASE_DIR = Path(__file__).resolve().parents[2]  # โฟลเดอร์ backend/
FONT_DIR = BASE_DIR / "fonts"
MEDIA_DIR = BASE_DIR / "media"

# ให้แน่ใจว่ามีโฟลเดอร์ media/contracts
(MEDIA_DIR / "contracts").mkdir(parents=True, exist_ok=True)

# -------------------------------
# 2) ฟอนต์ TH Sarabun (มี fallback)
# -------------------------------
FONT_REGULAR = "THSarabunNew"
FONT_BOLD = "THSarabunNew-Bold"


def _register_thai_fonts():
    """
    พยายามลงทะเบียนฟอนต์ TH Sarabun New
    ถ้าไม่เจอไฟล์ / เปิดไม่ได้ จะ fallback ไปใช้ Helvetica
    """
    global FONT_REGULAR, FONT_BOLD

    try:
        regular_path = FONT_DIR / "THSarabunNew.ttf"
        bold_path = FONT_DIR / "THSarabunNew Bold.ttf"

        pdfmetrics.registerFont(TTFont(FONT_REGULAR, str(regular_path)))
        pdfmetrics.registerFont(TTFont(FONT_BOLD, str(bold_path)))
        print(f"[PDF] Use TH Sarabun New from {regular_path}")
    except Exception as e:
        print(f"[PDF] WARNING: cannot register TH Sarabun fonts: {e}")
        FONT_REGULAR = "Helvetica"
        FONT_BOLD = "Helvetica-Bold"


_register_thai_fonts()

# -------------------------------
# 3) ค่าคงที่ผู้ให้เช่า + บัญชีธนาคาร
# -------------------------------
LANDLORD_NAME = "Somkid Apartment"
LANDLORD_CONTACT = "ผู้ดูแล Somkid Apartment"
LANDLORD_ADDRESS = "อาคาร Somkid Apartment, กรุงเทพมหานคร"
LANDLORD_PHONE = "โทร. 0-0000-0000"

BANK_NAME = "ธนาคารกสิกรไทย"
BANK_ACCOUNT_NAME = "Somkid Apartment"
BANK_ACCOUNT_NUMBER = "123-4-56789-0"

BANK_QR_DEFAULT = MEDIA_DIR / "bank_qr.png"

# -------------------------------
# 4) ข้อความสัญญาเริ่มต้น
# -------------------------------
DEFAULT_CONTRACT_TEXT = (
    "1. ผู้เช่าตกลงปฏิบัติตามระเบียบของอาคาร เช่น การงดใช้เสียงดังรบกวนผู้อื่น "
    "การห้ามประกอบกิจการผิดกฎหมาย การห้ามนำวัตถุอันตรายหรือสิ่งผิดกฎหมายเข้ามาในอาคาร "
    "และรักษาความสะอาดส่วนกลางตามที่ผู้ให้เช่ากำหนด\n\n"
    "2. ผู้เช่าตกลงชำระค่าเช่ารายเดือนให้ครบถ้วนภายในกำหนดเวลาที่ระบุ "
    "หากชำระล่าช้าผู้เช่ายินยอมให้ผู้ให้เช่าคิดค่าปรับตามที่กำหนด โดยไม่ถือเป็นการผิดสัญญาของผู้ให้เช่า\n\n"
    "3. ผู้ให้เช่ามีสิทธิ์เข้าตรวจสอบสภาพห้องพักเป็นครั้งคราว "
    "โดยจะแจ้งให้ผู้เช่าทราบล่วงหน้าตามสมควร และผู้เช่ายินยอมให้ความร่วมมือในการตรวจสอบดังกล่าว\n\n"
    "4. เมื่อสิ้นสุดสัญญาเช่า ผู้เช่าต้องคืนกุญแจและทรัพย์สินของห้องพักทั้งหมด "
    "หากพบความเสียหายของทรัพย์สินภายในห้องพัก ผู้ให้เช่ามีสิทธิ์หักจากเงินมัดจำ "
    "และเรียกเก็บส่วนที่เกิน (ถ้ามี)\n\n"
    "*** ข้อความส่วนนี้สามารถแก้ไขเพิ่มเติมได้โดยเจ้าของห้อง ก่อนอนุมัติสัญญาให้ผู้เช่าตรวจสอบและยืนยัน ***"
)

# -------------------------------
# 5) Helpers
# -------------------------------
def draw_paragraph(
    c: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    max_width: float,
    leading: float = 18,
    font_name: str = FONT_REGULAR,
    font_size: int = 14,
) -> float:
    from reportlab.pdfbase.pdfmetrics import stringWidth

    c.setFont(font_name, font_size)
    lines = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            lines.append("")
            continue
        words = line.split(" ")
        current = ""
        for w in words:
            test = (current + " " + w).strip()
            if stringWidth(test, font_name, font_size) <= max_width:
                current = test
            else:
                if current:
                    lines.append(current)
                current = w
        if current:
            lines.append(current)

    width, height = A4
    margin_bottom = 60

    for line in lines:
        if y < margin_bottom:
            c.showPage()
            y = height - 80
            c.setFont(font_name, font_size)

        if line == "":
            y -= leading / 2
        else:
            c.drawString(x, y, line)
            y -= leading

    return y


def draw_two_col_row(
    c: canvas.Canvas,
    x: float,
    y: float,
    col_width: float,
    label_left: str,
    value_left: str,
    label_right: str,
    value_right: str,
    row_height: float = 20,
):
    c.setFont(FONT_REGULAR, 14)
    c.line(x, y - row_height, x + col_width * 2, y - row_height)
    c.drawString(x + 6, y - 15, f"{label_left}: {value_left}")
    c.drawString(x + col_width + 6, y - 15, f"{label_right}: {value_right}")
    return y - row_height


# -------------------------------
# 6) ฟังก์ชันสร้าง PDF สัญญา
# -------------------------------
def generate_contract_pdf(
    contract_id: int,
    tenant,
    booking,
    id_image_path: Optional[str] = None,
    contract_text: Optional[str] = None,
    bank_qr_path: Optional[str] = None,
    contract_no: Optional[str] = None,  # ✅ เพิ่มเลขที่สัญญามาใช้แสดง
) -> str:
    """
    สร้างไฟล์ PDF สัญญามัดจำห้องพัก
    คืนค่า: relative URL เช่น "/media/contracts/contract_1.pdf"
    """

    # ถ้าไม่ได้ส่ง bank_qr_path มา ให้ลองใช้ไฟล์ default
    if bank_qr_path is None and BANK_QR_DEFAULT.exists():
        bank_qr_path = str(BANK_QR_DEFAULT)

    contracts_dir = MEDIA_DIR / "contracts"
    contracts_dir.mkdir(parents=True, exist_ok=True)

    filename = f"contract_{contract_id}.pdf"
    file_path = str(contracts_dir / filename)

    # booking ไม่มี field end_date → ใช้ lease_start_date + lease_term_months
    if getattr(booking, "lease_start_date", None):
        lease_start_str = booking.lease_start_date.strftime("%d/%m/%Y")
        if getattr(booking, "lease_term_months", None):
            lease_end_date = booking.lease_start_date + timedelta(
                days=30 * booking.lease_term_months
            )
            lease_end_str = lease_end_date.strftime("%d/%m/%Y")
        else:
            lease_end_str = "-"
    else:
        lease_start_str = "-"
        lease_end_str = "-"

    monthly_rent = (
        f"{booking.agreed_monthly_rent:,.2f}"
        if getattr(booking, "agreed_monthly_rent", None) is not None
        else "-"
    )
    deposit_amount = (
        f"{booking.deposit_amount:,.2f}"
        if getattr(booking, "deposit_amount", None) is not None
        else "-"
    )

    if not contract_text or not contract_text.strip():
        contract_text = DEFAULT_CONTRACT_TEXT

    full_name = f"{getattr(tenant, 'first_name', '-') } {getattr(tenant, 'last_name', '')}".strip()

    c = canvas.Canvas(file_path, pagesize=A4)
    width, height = A4

    margin_x = 60
    content_width = width - margin_x * 2
    y = height - 60

    # ===== Header =====
    c.setFont(FONT_BOLD, 24)
    c.drawCentredString(width / 2, y, "หนังสือสัญญามัดจำการเช่าห้องพัก")
    y -= 26

    c.setFont(FONT_REGULAR, 16)
    c.drawCentredString(width / 2, y, LANDLORD_NAME)
    y -= 10

    c.setLineWidth(1)
    c.line(margin_x, y, width - margin_x, y)
    y -= 20

    c.setFont(FONT_REGULAR, 14)
    today_str = datetime.now().strftime("%d/%m/%Y")
    c.drawRightString(
        width - margin_x,
        y + 10,
        f"วันที่จัดทำสัญญา: {today_str}   เลขที่สัญญา: {contract_no or contract_id}",
    )

    # ===== 1. คู่สัญญา =====
    y -= 10
    c.setFont(FONT_BOLD, 16)
    c.drawString(margin_x, y, "1. ข้อมูลคู่สัญญา")
    y -= 18

    col_width = content_width / 2
    header_y = y

    c.setFont(FONT_BOLD, 15)
    c.drawString(margin_x + 6, header_y, "ผู้เช่า (Tenant)")
    c.drawString(margin_x + col_width + 6, header_y, "ผู้ให้เช่า (Lessor)")
    y -= 8
    c.line(margin_x, y, margin_x + content_width, y)
    y -= 4

    y = draw_two_col_row(
        c,
        margin_x,
        y,
        col_width,
        "ชื่อ-สกุล",
        full_name or "-",
        "ชื่อผู้ให้เช่า",
        LANDLORD_CONTACT,
    )
    y = draw_two_col_row(
        c,
        margin_x,
        y,
        col_width,
        "เลขบัตร/Passport",
        getattr(tenant, "id_card_number", "-") or "-",
        "สถานที่ติดต่อ",
        LANDLORD_ADDRESS,
    )
    y = draw_two_col_row(
        c,
        margin_x,
        y,
        col_width,
        "เบอร์โทรศัพท์",
        getattr(tenant, "phone", "-") or "-",
        "เบอร์โทรศัพท์",
        LANDLORD_PHONE,
    )

    y -= 24

    # ===== 2. รายละเอียดการเช่าห้องพัก =====
    c.setFont(FONT_BOLD, 16)
    c.drawString(margin_x, y, "2. รายละเอียดการเช่าห้องพัก")
    y -= 18

    c.setFont(FONT_REGULAR, 14)
    detail_lines = [
        f"หมายเลขห้องพัก          : {booking.room_id}",
        f"วันเริ่มต้นสัญญาเช่า    : {lease_start_str}",
        f"วันสิ้นสุดสัญญาเช่า     : {lease_end_str}",
        f"ค่าเช่ารายเดือน         : {monthly_rent} บาท",
        f"จำนวนเงินมัดจำ          : {deposit_amount} บาท",
    ]
    for line in detail_lines:
        c.drawString(margin_x + 10, y, line)
        y -= 18

    y -= 6

    # ===== 3. ข้อความสัญญา =====
    c.setFont(FONT_BOLD, 16)
    c.drawString(margin_x, y, "3. ข้อความสัญญา")
    y -= 22

    y = draw_paragraph(
        c,
        contract_text,
        x=margin_x + 10,
        y=y,
        max_width=content_width - 10,
        leading=18,
        font_name=FONT_REGULAR,
        font_size=14,
    )

    # ===== 4. รูปบัตรประชาชน / Passport =====
    if id_image_path and os.path.exists(id_image_path):
        if y < 260:
            c.showPage()
            y = height - 80

        c.setFont(FONT_BOLD, 16)
        c.drawString(margin_x, y, "4. รูปบัตรประชาชน / Passport ผู้เช่า")
        y -= 22

        try:
            img = ImageReader(id_image_path)
            img_width = 260
            img_height = 170
            c.drawImage(
                img,
                margin_x + 10,
                y - img_height,
                width=img_width,
                height=img_height,
                preserveAspectRatio=True,
                mask="auto",
            )
            y = y - img_height - 20
        except Exception as e:
            c.setFont(FONT_REGULAR, 12)
            c.drawString(margin_x + 10, y, f"* ไม่สามารถแสดงรูปบัตรได้: {e}")
            y -= 18
    else:
        if y < 120:
            c.showPage()
            y = height - 80

        c.setFont(FONT_BOLD, 16)
        c.drawString(margin_x, y, "4. รูปบัตรประชาชน / Passport ผู้เช่า")
        y -= 20
        c.setFont(FONT_REGULAR, 14)
        c.drawString(margin_x + 10, y, "* ไม่มีไฟล์รูปบัตรแนบในระบบ")
        y -= 22

    # ===== 5. ช่องทางการชำระเงิน (มัดจำ/ค่าเช่า) =====
    if y < 200:
        c.showPage()
        y = height - 80

    c.setFont(FONT_BOLD, 16)
    c.drawString(margin_x, y, "5. ช่องทางการชำระเงิน (มัดจำ/ค่าเช่า)")
    y -= 22

    c.setFont(FONT_REGULAR, 14)
    c.drawString(margin_x + 10, y, f"ธนาคาร        : {BANK_NAME}")
    y -= 18
    c.drawString(
        margin_x + 10,
        y,
        f"ชื่อบัญชี      : {BANK_ACCOUNT_NAME}",
    )
    y -= 18
    c.drawString(
        margin_x + 10,
        y,
        f"เลขที่บัญชี   : {BANK_ACCOUNT_NUMBER}",
    )
    y -= 30

    # ===== 6. ลายมือชื่อคู่สัญญา =====
    if y < 180:
        c.showPage()
        y = height - 220

    c.setFont(FONT_BOLD, 16)
    c.drawCentredString(width / 2, y, "6. ลายมือชื่อคู่สัญญา")
    y -= 36

    line_length = 160
    space_between = 120
    center_x = width / 2

    tenant_line_x1 = center_x - line_length - space_between / 2
    tenant_line_x2 = tenant_line_x1 + line_length

    lessor_line_x1 = center_x + space_between / 2
    lessor_line_x2 = lessor_line_x1 + line_length

    c.setLineWidth(1)
    c.line(tenant_line_x1, y, tenant_line_x2, y)
    c.line(lessor_line_x1, y, lessor_line_x2, y)

    label_y = y - 16
    c.setFont(FONT_REGULAR, 14)

    c.drawCentredString(
        (tenant_line_x1 + tenant_line_x2) / 2,
        label_y,
        "ผู้เช่า",
    )
    c.drawCentredString(
        (tenant_line_x1 + tenant_line_x2) / 2,
        label_y - 16,
        f"({full_name})",
    )

    c.drawCentredString(
        (lessor_line_x1 + lessor_line_x2) / 2,
        label_y,
        "ผู้ให้เช่า",
    )
    c.drawCentredString(
        (lessor_line_x1 + lessor_line_x2) / 2,
        label_y - 16,
        f"({LANDLORD_CONTACT})",
    )

    # ===== QR มุมล่างขวา =====
    if bank_qr_path and os.path.exists(bank_qr_path):
        try:
            img = ImageReader(bank_qr_path)
            qr_size = 120
            qr_x = width - margin_x - qr_size
            qr_y = 60

            c.drawImage(
                img,
                qr_x,
                qr_y,
                width=qr_size,
                height=qr_size,
                preserveAspectRatio=True,
                mask="auto",
            )
            c.setFont(FONT_REGULAR, 12)
            c.drawCentredString(
                qr_x + qr_size / 2,
                qr_y - 14,
                "สแกนเพื่อชำระเงิน",
            )
        except Exception as e:
            c.setFont(FONT_REGULAR, 12)
            c.drawString(
                width - margin_x - 200,
                40,
                f"* ไม่สามารถแสดง QR Code ได้: {e}",
            )

    c.save()

    # คืนค่าเป็น relative URL
    return f"/media/contracts/{filename}"
