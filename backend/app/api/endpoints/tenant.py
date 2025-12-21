# backend/app/api/endpoints/tenant.py
from __future__ import annotations

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.database import get_session

# ✅ ใช้ model จาก models เท่านั้น (กัน table ซ้ำ)
from app.models.tenant import Tenant

# ✅ ใช้ schema จาก schemas
from app.schemas.tenant import TenantCreate, TenantRead

router = APIRouter(prefix="/tenants", tags=["Tenants"])


@router.post("/", response_model=TenantRead, status_code=status.HTTP_201_CREATED)
def create_tenant(tenant: TenantCreate, session: Session = Depends(get_session)):
    db_tenant = Tenant(**tenant.model_dump())

    session.add(db_tenant)
    try:
        session.commit()
    except Exception:
        session.rollback()
        # กัน error unique id_card_number ชนกัน (แบบสั้น ๆ)
        raise HTTPException(
            status_code=400,
            detail="Cannot create tenant (maybe duplicate id_card_number)",
        )

    session.refresh(db_tenant)
    return db_tenant


@router.get("/", response_model=List[TenantRead])
def read_tenants(session: Session = Depends(get_session)):
    return session.exec(select(Tenant)).all()


@router.get("/{tenant_id}", response_model=TenantRead)
def read_tenant(tenant_id: int, session: Session = Depends(get_session)):
    tenant = session.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant
