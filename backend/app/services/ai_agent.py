# backend/app/services/ai_agent.py
from typing import Optional

from app.core.config import settings

SYSTEM_PROMPT = """
คุณคือ "ผู้ช่วยอัตโนมัติของอพาร์ตเมนต์" ทำหน้าที่ช่วยตอบคำถามผู้เช่าเกี่ยวกับกฎ/การชำระเงิน/การแจ้งซ่อม/ข่าวประกาศ/เวลาเปิด-ปิด
- ตอบสุภาพ กระชับ แต่มีประโยชน์
- ถ้าไม่มั่นใจ ให้แนะนำให้ติดต่อผู้ดูแล
- ห้ามแต่งข้อมูล เช่น ราคาหรือกฎที่ไม่มีในระบบ
""".strip()


def _extract_content(data: object) -> Optional[str]:
    if not isinstance(data, dict):
        return None

    # รูปแบบ Ollama: {"message": {"content": "..."}}
    msg = data.get("message")
    if isinstance(msg, dict) and isinstance(msg.get("content"), str):
        return msg["content"].strip()

    # รูปแบบ OpenAI-like proxy: {"choices":[{"message":{"content":"..."}}]}
    choices = data.get("choices")
    if isinstance(choices, list) and choices:
        c0 = choices[0]
        if isinstance(c0, dict):
            m = c0.get("message")
            if isinstance(m, dict) and isinstance(m.get("content"), str):
                return m["content"].strip()

    # fallback
    if isinstance(data.get("content"), str):
        return data["content"].strip()

    return None


async def ask_ai_agent(user_message: str, context: Optional[str] = None) -> str:
    try:
        import httpx
    except Exception:
        return (
            "ขณะนี้ระบบ AI ยังไม่พร้อมใช้งาน (ยังไม่ได้ติดตั้ง httpx)\n"
            "กรุณาให้ผู้ดูแลติดตั้ง: pip install httpx"
        )

    prompt = user_message if not context else f"{context}\n\nผู้เช่า: {user_message}"

    payload = {
        "model": settings.AI_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        "stream": False,
    }

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(settings.AI_PROVIDER_URL, json=payload)
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return "ขอโทษครับ ตอนนี้ระบบ AI ไม่พร้อมให้บริการชั่วคราว กรุณาลองใหม่อีกครั้ง หรือให้ผู้ดูแลช่วยตรวจสอบ"

    content = _extract_content(data)
    return content or "ขอโทษครับ ตอนนี้ AI ไม่สามารถตอบได้ กรุณาลองใหม่อีกครั้ง"
