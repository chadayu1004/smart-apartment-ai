# backend/app/api/endpoints/calendar_events.py
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.core.database import get_session
from app.api.endpoints.auth import get_current_user

# ✅ ชื่อโมเดลจริงของคุณ
from app.models.calendar_events import CalendarEvent, CalendarVisibility
from app.schemas.calendar_event import (
    CalendarEventCreate,
    CalendarEventRead,
    CalendarEventUpdate,
)

router = APIRouter(prefix="/calendar-events", tags=["Calendar"])


# ------------------------------
# GET /calendar-events/admin  (Admin only)
# optional filter start/end
# ------------------------------
@router.get("/admin", response_model=List[CalendarEventRead])
def get_admin_events(
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user),
    start: Optional[datetime] = Query(default=None),
    end: Optional[datetime] = Query(default=None),
):
    if getattr(current_user, "role", None) != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    stmt = select(CalendarEvent)

    # optional range filter
    if start is not None:
        stmt = stmt.where(CalendarEvent.start >= start)
    if end is not None:
        # ถ้า end เป็น None ใน record ให้ไม่ตัดทิ้ง: show ได้
        stmt = stmt.where((CalendarEvent.end == None) | (CalendarEvent.end <= end))  # noqa: E711

    return session.exec(stmt.order_by(CalendarEvent.start.asc())).all()


# ------------------------------
# GET /calendar-events/tenant/me (Tenant only)
# optional filter start/end
# ------------------------------
@router.get("/tenant/me", response_model=List[CalendarEventRead])
def get_tenant_events(
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user),
    start: Optional[datetime] = Query(default=None),
    end: Optional[datetime] = Query(default=None),
):
    if getattr(current_user, "role", None) != "tenant":
        raise HTTPException(status_code=403, detail="Tenant only")

    tenant_id = getattr(current_user, "tenant_id", None)

    # tenant เห็น:
    # - TENANT_PUBLIC ทั้งหมด
    # - TENANT_PRIVATE เฉพาะของตัวเอง
    stmt = select(CalendarEvent).where(
        (CalendarEvent.visibility == CalendarVisibility.TENANT_PUBLIC)
        | (
            (CalendarEvent.visibility == CalendarVisibility.TENANT_PRIVATE)
            & (CalendarEvent.tenant_id == tenant_id)
        )
    )

    if start is not None:
        stmt = stmt.where(CalendarEvent.start >= start)
    if end is not None:
        stmt = stmt.where((CalendarEvent.end == None) | (CalendarEvent.end <= end))  # noqa: E711

    return session.exec(stmt.order_by(CalendarEvent.start.asc())).all()


# ------------------------------
# POST /calendar-events  (Admin/Tenant)
# tenant create -> force private + set tenant_id
# ------------------------------
@router.post("", response_model=CalendarEventRead, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: CalendarEventCreate,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user),
):
    role = getattr(current_user, "role", None)

    data = payload.model_dump()

    if role == "tenant":
        data["visibility"] = CalendarVisibility.TENANT_PRIVATE
        data["tenant_id"] = getattr(current_user, "tenant_id", None)

    ev = CalendarEvent(
        **data,
        created_by_user_id=getattr(current_user, "id", 0),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    session.add(ev)
    session.commit()
    session.refresh(ev)
    return ev


# ------------------------------
# PATCH /calendar-events/{id}  (Admin or owner tenant)
# ------------------------------
@router.patch("/{event_id}", response_model=CalendarEventRead)
def update_event(
    event_id: int,
    payload: CalendarEventUpdate,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user),
):
    ev = session.get(CalendarEvent, event_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    role = getattr(current_user, "role", None)
    user_id = getattr(current_user, "id", None)

    if role == "tenant" and ev.created_by_user_id != user_id:
        raise HTTPException(status_code=403, detail="Not allowed")

    patch = payload.model_dump(exclude_unset=True)

    # tenant ห้ามเปลี่ยน visibility/tenant_id (กันเห็นของคนอื่น)
    if role == "tenant":
        patch.pop("visibility", None)
        patch.pop("tenant_id", None)

    for k, v in patch.items():
        setattr(ev, k, v)

    ev.updated_at = datetime.utcnow()
    session.add(ev)
    session.commit()
    session.refresh(ev)
    return ev


# ------------------------------
# DELETE /calendar-events/{id}  (Admin or owner tenant)
# ------------------------------
@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: int,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user),
):
    ev = session.get(CalendarEvent, event_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Not found")

    role = getattr(current_user, "role", None)
    user_id = getattr(current_user, "id", None)

    if role == "tenant" and ev.created_by_user_id != user_id:
        raise HTTPException(status_code=403, detail="Not allowed")

    session.delete(ev)
    session.commit()
