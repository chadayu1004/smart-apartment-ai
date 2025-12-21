from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.database import init_db
from app.api.endpoints.tenant import router as tenant_router
from app.api.endpoints import (
    announcements,
    ai,
    bookings,
    auth,
    my_room,
    rooms,
    contracts,
    notifications,
    payment,
    meters,
)

app = FastAPI(
    title="Smart Apartment AI API",
    version="2.0.0 Refactored",
)

# ---------- CORS ----------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # DEV
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Static / Media ----------
os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

os.makedirs("media", exist_ok=True)
app.mount("/media", StaticFiles(directory="media"), name="media")


@app.on_event("startup")
def on_startup() -> None:
    init_db()


# ---------- Routers ----------
app.include_router(announcements.router)
app.include_router(tenant_router)  # /tenants
app.include_router(ai.router, prefix="/ai", tags=["AI / OCR"])
app.include_router(bookings.router, prefix="/bookings", tags=["Bookings"])
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(my_room.router, prefix="/my-room", tags=["Tenant Portal"])
app.include_router(rooms.router, prefix="/rooms", tags=["Rooms"])
app.include_router(meters.router, prefix="/meters", tags=["Meters"])
app.include_router(payment.router, prefix="/payments", tags=["Payments"])
app.include_router(contracts.router)
app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])


@app.get("/")
def read_root():
    return {"message": "Smart Apartment API (Refactored Structure)"}
