# app/api/endpoints/announcements.py
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.database import get_db
from app.models.announcement import Announcement
from app.schemas.announcement import (
    AnnouncementCreate,
    AnnouncementUpdate,
    AnnouncementOut,
)

router = APIRouter(prefix="/announcements", tags=["Announcements"])


# GET /announcements/
@router.get("/", response_model=List[AnnouncementOut])
def list_announcements(db: Session = Depends(get_db)):
    statement = (
        select(Announcement)
        .where(Announcement.is_active == True)
        .order_by(Announcement.created_at.desc())
    )
    items = db.exec(statement).all()
    return items


# POST /announcements/
@router.post(
    "/",
    response_model=AnnouncementOut,
    status_code=status.HTTP_201_CREATED,
)
def create_announcement(
    payload: AnnouncementCreate,
    db: Session = Depends(get_db),
):
    item = Announcement(
        title=payload.title.strip(),
        content=payload.content.strip(),
        is_active=True,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


# PUT /announcements/{id}
@router.put("/{announcement_id}", response_model=AnnouncementOut)
def update_announcement(
    announcement_id: int,
    payload: AnnouncementUpdate,
    db: Session = Depends(get_db),
):
    statement = select(Announcement).where(Announcement.id == announcement_id)
    item = db.exec(statement).first()

    if not item:
        raise HTTPException(status_code=404, detail="Announcement not found")

    if payload.title is not None:
        item.title = payload.title.strip()
    if payload.content is not None:
        item.content = payload.content.strip()
    if payload.is_active is not None:
        item.is_active = payload.is_active

    db.add(item)
    db.commit()
    db.refresh(item)
    return item


# DELETE /announcements/{id}
@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
):
    statement = select(Announcement).where(Announcement.id == announcement_id)
    item = db.exec(statement).first()

    if not item:
        raise HTTPException(status_code=404, detail="Announcement not found")

    db.delete(item)
    db.commit()
    return None
