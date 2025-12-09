# backend/app/services/doc_codes.py

"""
กำหนดรูปแบบ Prefix ของเอกสารต่าง ๆ ในระบบ Smart Apartment

รูปแบบเลขที่เอกสาร (แนะนำ):
    [PREFIX]-[YYYY][MM][DD]-[RUNNO4]

ตัวอย่าง:
    DEP-20251204-0003   (สัญญามัดจำลำดับที่ 3 ของวันที่ 04/12/2025)
    CTR-20250115-0008   (สัญญาเช่าลำดับที่ 8 ของวันที่ 15/01/2025)
    INV-202512-0032     (ใบแจ้งหนี้รวม เดือน 12/2025 เลขที่ 32)
"""

# 1) สัญญาเช่า (Contracts)
CONTRACT_PREFIXES = {
    "rent": "CTR",        # สัญญาเช่า
    "renew": "CTR-REN",   # ต่อสัญญาเช่า
    "cancel": "CTR-CXL",  # ยกเลิกสัญญา
    "deposit": "DEP",     # สัญญามัดจำ
}

# 2) Billing / ใบแจ้งหนี้
BILLING_PREFIXES = {
    "invoice_full": "INV",       # ใบแจ้งหนี้รวมทุกค่าใช้จ่าย (น้ำ/ไฟ/ค่าเช่า ฯลฯ)  ==> ใช้อันนี้เป็นหลัก
    "invoice_water": "INV-WTR",  # แยกเฉพาะค่าน้ำ (ถ้าต้องการ)
    "invoice_elec": "INV-ELC",   # แยกเฉพาะค่าไฟ
    "invoice_rent": "INV-RNT",   # แยกเฉพาะค่าเช่า
    "invoice_all": "INV-FULL",   # รวมค่าใช้จ่ายทั้งหมด (ชื่อสำรอง ถ้าจะแยกจาก INV)
}

# เอกสารข้อ 2 ที่สรุป: ใช้ "INV" เป็นใบแจ้งหนี้หลักที่รวมทุกค่าใช้จ่าย
BILLING_MAIN_PREFIX = "INV"

# 3) ใบเสร็จรับเงิน / Payment
RECEIPT_PREFIXES = {
    "receipt": "RCPT",        # ใบเสร็จรับเงินทั่วไป
    "receipt_deposit": "RCPT-DEP",  # ใบเสร็จชำระมัดจำ
    "receipt_rent": "RCPT-RNT",     # ใบเสร็จชำระค่าเช่า
}

# 4) เอกสารแจ้งซ่อม / Maintenance
MAINTENANCE_PREFIXES = {
    "ticket": "MTN",       # ใบแจ้งซ่อม
    "ticket_done": "MTN-DONE",  # ปิดงานซ่อม
}
