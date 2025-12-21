# backend/app/api/endpoints/__init__.py
from . import announcements
from . import tenant
from . import ai
from . import bookings
from . import auth
from . import my_room
from . import rooms
from . import contracts
from . import notifications
from . import payment
from . import meters
from . import calendar_events
from . import chat

__all__ = [
    "announcements",
    "tenant",
    "ai",
    "bookings",
    "auth",
    "my_room",
    "rooms",
    "contracts",
    "notifications",
    "payment",
    "meters",
    "calendar_events",
    "chat",
]
