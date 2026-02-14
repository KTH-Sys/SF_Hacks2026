import uuid
from datetime import datetime, timedelta


def new_match(
    listing_a_id: str,
    listing_b_id: str,
    user_a_id: str,
    user_b_id: str,
) -> dict:
    now = datetime.utcnow()
    return {
        "_id": str(uuid.uuid4()),
        "listing_a_id": listing_a_id,
        "listing_b_id": listing_b_id,
        "user_a_id": user_a_id,
        "user_b_id": user_b_id,
        "status": "active",               # active | confirmed | cancelled | expired
        "confirmed_by_a": False,
        "confirmed_by_b": False,
        "created_at": now,
        "expires_at": now + timedelta(days=7),
    }
