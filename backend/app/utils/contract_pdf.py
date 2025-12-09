from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
import os
from datetime import datetime


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.join(BASE_DIR, "../../fonts")

# ------------- Register Thai Fonts -------------------
pdfmetrics.registerFont(TTFont("THSarabun", os.path.join(FONT_DIR, "THSarabunNew.ttf")))
pdfmetrics.registerFont(TTFont("THSarabun-Bold", os.path.join(FONT_DIR, "THSarabunNew Bold.ttf")))


def draw_text(c, text, x, y, bold=False, size=18):
    c.setFont("THSarabun-Bold" if bold else "THSarabun", size)
    c.drawString(x, y, text)


def generate_contract_pdf(
    output_path: str,
    tenant,
    room,
    contract,
    ocr_image_path: str = None,
):
    c = canvas.Canvas(output_path, pagesize=A4)
    width, height = A4

    y = height - 40

    # -------- Header ----------
    draw_text(c, "สัญญามัดจำที่พัก (Somkid Apartment)", 60, y, bold=True, size=24)
    y -= 25
    draw_text(c, f"วันที่ทำสัญญา: {contract.start_date.strftime('%d/%m/%Y')}", 60, y)

    # -------- Tenant Info ----------
    y -= 40
    draw_text(c, "1. ข้อมูลผู้เช่า", 60, y, bold=True)
    y -= 25
    draw_text(c, f"ชื่อ – สกุล: {tenant.first_name} {tenant.last_name}", 80, y)
    y -= 20
    draw_text(c, f"เลขบัตรประชาชน / Passport: {tenant.id_card_number}", 80, y)
    y -= 20
    if tenant.phone:
        draw_text(c, f"เบอร์ติดต่อ: {tenant.phone}", 80, y)

    # -------- Room Info ----------
    y -= 40
    draw_text(c, "2. ข้อมูลห้องพัก", 60, y, bold=True)
    y -= 25
    draw_text(c, f"หมายเลขห้อง: {room.room_number}", 80, y)
    y -= 20
    draw_text(c, f"วันที่เริ่มพัก: {contract.start_date.strftime('%d/%m/%Y')}", 80, y)
    y -= 20
    draw_text(c, f"ค่าเช่ารายเดือน: {contract.monthly_rent:,.2f} บาท", 80, y)
    y -= 20
    draw_text(c, f"ค่ามัดจำ: {contract.deposit_amount:,.2f} บาท", 80, y)
    y -= 20
    draw_text(c, f"กำหนดชำระมัดจำภายในวันที่: {contract.deposit_due_date.strftime('%d/%m/%Y')}", 80, y)

    # -------- Contract Terms (จาก Admin Textarea) ----------
    y -= 40
    draw_text(c, "3. ข้อสัญญาเพิ่มเติม", 60, y, bold=True)
    y -= 30

    contract_text_lines = contract.contract_text.split("\n")
    for line in contract_text_lines:
        draw_text(c, line, 80, y)
        y -= 20
        if y < 80:
            c.showPage()
            y = height - 80

    # -------- OCR Image ----------
    if ocr_image_path and os.path.exists(ocr_image_path):
        y -= 30
        draw_text(c, "4. สำเนาบัตรประชาชน / Passport", 60, y, bold=True)
        y -= 10

        img = ImageReader(ocr_image_path)
        c.drawImage(img, 60, y - 120, width=200, preserveAspectRatio=True, mask='auto')
        y -= 150

    # -------- Sign Section ----------
    y -= 40
    draw_text(c, "5. ลายเซ็นคู่สัญญา", 60, y, bold=True)
    y -= 40

    draw_text(c, "__________________________", 60, y)
    draw_text(c, f"({tenant.first_name} {tenant.last_name}) ผู้เช่า", 60, y - 20)

    draw_text(c, "__________________________", 300, y)
    draw_text(c, "(ผู้ดูแลอาคาร Somkid Apartment)", 300, y - 20)

    c.save()
    return output_path
