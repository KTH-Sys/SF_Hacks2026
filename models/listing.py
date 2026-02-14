import uuid
from datetime import datetime
from typing import List, Optional


def new_listing(
    user_id: str,
    title: str,
    category: str,
    condition: str,
    estimated_value: float,
    images: List[str],
    description: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    ai_value_low: Optional[float] = None,
    ai_value_high: Optional[float] = None,
) -> dict:
    """Return a MongoDB-ready listing document."""
    now = datetime.utcnow()
    return {
        "_id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title,
        "description": description,
        "category": category,
        "condition": condition,
        "estimated_value": estimated_value,
        "ai_value_low": ai_value_low,
        "ai_value_high": ai_value_high,
        "images": images,         # list of base64 strings or URLs
        "latitude": latitude,
        "longitude": longitude,
        "status": "active",
        "view_count": 0,
        "created_at": now,
        "updated_at": now,
    }
