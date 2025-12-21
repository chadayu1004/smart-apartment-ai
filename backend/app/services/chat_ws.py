import asyncio
from dataclasses import dataclass
from typing import Dict, Set, Tuple, Optional
from datetime import datetime

from fastapi import WebSocket
from sqlmodel import Session, select

from app.models.chat_thread import ChatThread


@dataclass
class Connection:
    ws: WebSocket
    user_role: str  # "admin" | "tenant"
    user_id: int
    tenant_id: int


class ChatHub:
    """
    - เก็บ connection ใน memory (พอสำหรับโปรเจคจริงระดับหนึ่ง)
    - Presence: admin_active per tenant_id
    - AI Pause: admin_active => ai_enabled=False, admin disconnect => ai_enabled=True
    """
    def __init__(self):
        self._lock = asyncio.Lock()
        self._connections: Dict[int, Set[WebSocket]] = {}  # tenant_id -> websockets
        self._admins_active: Dict[int, int] = {}  # tenant_id -> count admin connections

    async def join(self, c: Connection, db: Session):
        async with self._lock:
            self._connections.setdefault(c.tenant_id, set()).add(c.ws)
            if c.user_role == "admin":
                self._admins_active[c.tenant_id] = self._admins_active.get(c.tenant_id, 0) + 1

        await self._sync_ai_switch(db, c.tenant_id)
        await self.broadcast_presence(c.tenant_id)

    async def leave(self, c: Connection, db: Session):
        async with self._lock:
            if c.tenant_id in self._connections:
                self._connections[c.tenant_id].discard(c.ws)
                if not self._connections[c.tenant_id]:
                    self._connections.pop(c.tenant_id, None)

            if c.user_role == "admin":
                cur = self._admins_active.get(c.tenant_id, 0)
                cur = max(0, cur - 1)
                if cur == 0:
                    self._admins_active.pop(c.tenant_id, None)
                else:
                    self._admins_active[c.tenant_id] = cur

        await self._sync_ai_switch(db, c.tenant_id)
        await self.broadcast_presence(c.tenant_id)

    async def is_admin_active(self, tenant_id: int) -> bool:
        async with self._lock:
            return self._admins_active.get(tenant_id, 0) > 0

    async def broadcast_json(self, tenant_id: int, payload: dict):
        async with self._lock:
            conns = list(self._connections.get(tenant_id, set()))
        for ws in conns:
            try:
                await ws.send_json(payload)
            except Exception:
                pass

    async def broadcast_presence(self, tenant_id: int):
        active = await self.is_admin_active(tenant_id)
        await self.broadcast_json(tenant_id, {"type": "presence", "admin_active": active})

    async def _sync_ai_switch(self, db: Session, tenant_id: int):
        active = await self.is_admin_active(tenant_id)
        thread = db.exec(select(ChatThread).where(ChatThread.tenant_id == tenant_id)).first()
        if not thread:
            thread = ChatThread(tenant_id=tenant_id, ai_enabled=not active, updated_at=datetime.utcnow())
            db.add(thread)
        else:
            thread.ai_enabled = not active
            thread.updated_at = datetime.utcnow()
        db.commit()


chat_hub = ChatHub()
