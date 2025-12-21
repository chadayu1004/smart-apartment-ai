from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlmodel import Session, select, and_, or_

from app.core.database import get_db
from app.models.chat_message import ChatMessage
from app.models.chat_thread import ChatThread
from app.models.user import User
from app.api.endpoints.auth import get_current_user, get_user_from_ws_token
from app.schemas.chat import ChatMessagesPageOut, ChatMessageOut
from app.services.chat_ws import chat_hub, Connection
from app.services.ai_agent import ask_ai_agent

import asyncio

router = APIRouter(prefix="/chat", tags=["Chat"])

# กัน AI ยิงรัวต่อ tenant (เบา ๆ ไม่กระทบ logic เดิม)
_ai_lock_by_tenant: dict[int, asyncio.Lock] = {}


def _ensure_thread(db: Session, tenant_id: int) -> ChatThread:
    thread = db.exec(select(ChatThread).where(ChatThread.tenant_id == tenant_id)).first()
    if not thread:
        thread = ChatThread(tenant_id=tenant_id, ai_enabled=True)
        db.add(thread)
        db.commit()
        db.refresh(thread)
    return thread


def _tenant_policy_guard(user: User, tenant_id: int) -> None:
    """
    ไม่กระทบ logic เก่า:
    - admin ผ่านเสมอ
    - tenant: ถ้ามี user.tenant_id ให้บังคับว่าต้องตรงกัน
    """
    if getattr(user, "role", None) == "admin":
        return

    if getattr(user, "role", None) == "tenant":
        u_tid = getattr(user, "tenant_id", None)
        # ถ้าระบบคุณไม่ได้มี tenant_id ใน user → จะไม่ไปบังคับ (คง behavior เดิม)
        if u_tid is not None and int(u_tid) != int(tenant_id):
            raise HTTPException(status_code=403, detail="Not allowed")


@router.get("/messages", response_model=ChatMessagesPageOut)
def get_messages_page(
    tenant_id: int = Query(...),
    limit: int = Query(30, ge=1, le=100),
    before_created_at: Optional[str] = Query(None),
    before_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # ✅ policy แบบไม่กระทบของเดิม (ถ้ามี tenant_id ก็ enforce ให้)
    _tenant_policy_guard(user, tenant_id)

    q = select(ChatMessage).where(ChatMessage.tenant_id == tenant_id)

    if before_created_at:
        try:
            bdt = datetime.fromisoformat(before_created_at.replace("Z", "+00:00")).replace(tzinfo=None)
        except Exception:
            raise HTTPException(status_code=400, detail="before_created_at must be ISO datetime")

        if before_id is None:
            q = q.where(ChatMessage.created_at < bdt)
        else:
            q = q.where(
                or_(
                    ChatMessage.created_at < bdt,
                    and_(ChatMessage.created_at == bdt, ChatMessage.id < before_id),
                )
            )

    # ✅ pagination เร็ว + stable (desc) แล้วส่งต่อให้ frontend reverse/normalize ได้
    q = q.order_by(ChatMessage.created_at.desc(), ChatMessage.id.desc()).limit(limit + 1)
    rows = list(db.exec(q).all())

    has_more = len(rows) > limit
    items = rows[:limit]

    next_before_created_at = None
    next_before_id = None
    if has_more and items:
        last = items[-1]
        next_before_created_at = last.created_at.isoformat()
        next_before_id = last.id

    return ChatMessagesPageOut(
        items=[ChatMessageOut.model_validate(x) for x in items],
        has_more=has_more,
        next_before_created_at=next_before_created_at,
        next_before_id=next_before_id,
    )


@router.websocket("/ws/{tenant_id}")
async def chat_ws(
    websocket: WebSocket,
    tenant_id: int,
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    # ✅ accept ก่อน เพื่อให้ client เห็น error เป็น JSON ได้ (คง behavior เดิม)
    await websocket.accept()

    # ✅ auth จาก token (คงของเดิม)
    user = get_user_from_ws_token(token, db)

    # ✅ policy แบบไม่กระทบของเดิม (ถ้ามี tenant_id ก็ enforce ให้)
    _tenant_policy_guard(user, tenant_id)

    c = Connection(ws=websocket, user_role=user.role, user_id=user.id, tenant_id=tenant_id)

    _ensure_thread(db, tenant_id)
    await chat_hub.join(c, db)

    try:
        while True:
            data = await websocket.receive_json()
            content = (data.get("content") or "").strip()
            if not content:
                continue

            # บันทึกข้อความคน
            msg = ChatMessage(
                tenant_id=tenant_id,
                sender_role=user.role,
                sender_user_id=user.id,
                content=content,
            )
            db.add(msg)
            db.commit()
            db.refresh(msg)

            await chat_hub.broadcast_json(
                tenant_id,
                {
                    "type": "message",
                    "id": msg.id,
                    "tenant_id": msg.tenant_id,
                    "sender_role": msg.sender_role,
                    "sender_user_id": msg.sender_user_id,
                    "content": msg.content,
                    "created_at": msg.created_at.isoformat(),
                },
            )

            # --- AI Auto Reply (ทำงานเฉพาะตอน admin ไม่ active) ---
            thread = _ensure_thread(db, tenant_id)
            admin_active = await chat_hub.is_admin_active(tenant_id)

            if thread.ai_enabled and (not admin_active) and user.role == "tenant":
                # ✅ กันยิงซ้อน: tenant เดียวกันไม่ให้ยิง AI พร้อมกันหลายรอบ
                lock = _ai_lock_by_tenant.setdefault(tenant_id, asyncio.Lock())
                if lock.locked():
                    continue

                async with lock:
                    ai_text = await ask_ai_agent(content)

                    ai_msg = ChatMessage(
                        tenant_id=tenant_id,
                        sender_role="ai",
                        sender_user_id=None,
                        content=ai_text,
                    )
                    db.add(ai_msg)
                    db.commit()
                    db.refresh(ai_msg)

                    await chat_hub.broadcast_json(
                        tenant_id,
                        {
                            "type": "message",
                            "id": ai_msg.id,
                            "tenant_id": ai_msg.tenant_id,
                            "sender_role": ai_msg.sender_role,
                            "sender_user_id": ai_msg.sender_user_id,
                            "content": ai_msg.content,
                            "created_at": ai_msg.created_at.isoformat(),
                        },
                    )

    except WebSocketDisconnect:
        pass
    finally:
        await chat_hub.leave(c, db)
