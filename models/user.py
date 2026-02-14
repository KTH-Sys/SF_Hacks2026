import uuid
from datetime import datetime


def new_user(email: str, hashed_password: str, display_name: str) -> dict:
    """Return a MongoDB-ready user document."""
    now = datetime.utcnow()
    uid = str(uuid.uuid4())
    return {
        "_id": uid,
        "email": email,
        "hashed_password": hashed_password,
        "display_name": display_name,
        "avatar_url": None,
        "bio": None,
        "latitude": None,
        "longitude": None,
        "city": None,
        "trade_radius_km": 25.0,
        "rating_avg": 0.0,
        "rating_count": 0,
        "is_active": True,
        "is_verified": False,
        "created_at": now,
        "updated_at": now,
    }
