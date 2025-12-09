import pytesseract
from PIL import Image
import re
import io

def verify_payment_slip(slip_image: bytes):
    try:
        # Process the slip image using pytesseract to extract text
        image = Image.open(io.BytesIO(slip_image))  # Convert the byte data to image
        text = pytesseract.image_to_string(image, lang="eng+tha")  # Use OCR to extract text

        # Extract relevant information (like reference number, amount, and payer name) from the OCR result
        reference_number = extract_reference_number(text)
        if not reference_number:
            return {"error": "ไม่พบหมายเลขอ้างอิงในสลิป"}

        amount = extract_amount(text)
        if not amount:
            return {"error": "ไม่พบจำนวนเงินในสลิป"}

        payer_name = extract_payer_name(text)
        if not payer_name:
            return {"error": "ไม่พบชื่อผู้โอนในสลิป"}

        # Return the extracted data as a dictionary
        return {
            "reference_number": reference_number,
            "amount": amount,
            "payer_name": payer_name,
            "status": "verified"
        }
    except Exception as e:
        return {"error": f"Error processing slip: {str(e)}"}

def extract_reference_number(text: str):
    # Regex to find a reference number (e.g., 12-digit number)
    reference_number = re.search(r"\d{12,}", text)
    return reference_number.group(0) if reference_number else None

def extract_amount(text: str):
    # Regex to find amount in the format of 1,000 or 1,000.00 (Thai Baht)
    amount = re.search(r"\d{1,3}(?:,\d{3})*(?:\.\d{2})?", text)  # Example for currency format
    return amount.group(0) if amount else None

def extract_payer_name(text: str):
    # Use regex to match the payer's name (for both male and female names in Thai)
    match = re.search(r"นาย\s*(\w+\s\w+)", text)  # Match male name
    if not match:
        match = re.search(r"นางสาว\s*(\w+\s\w+)", text)  # Match female name
    return match.group(1) if match else None
