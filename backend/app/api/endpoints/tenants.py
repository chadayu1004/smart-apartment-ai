from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List

from app.core.database import get_session
from app.models.tenant import Tenant
from app.schemas.tenant import TenantCreate, TenantRead

router = APIRouter()

@router.post("/", response_model=TenantRead)
def create_tenant(tenant: TenantCreate, session: Session = Depends(get_session)):
    # แปลงจาก Schema (Pydantic) -> Model (Database)
    db_tenant = Tenant.from_orm(tenant)
    session.add(db_tenant)
    session.commit()
    session.refresh(db_tenant)
    return db_tenant

@router.get("/", response_model=List[TenantRead])
def read_tenants(session: Session = Depends(get_session)):
    tenants = session.exec(select(Tenant)).all()
    return tenants

@router.get("/{tenant_id}", response_model=TenantRead)
def read_tenant(tenant_id: int, session: Session = Depends(get_session)):
    tenant = session.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant