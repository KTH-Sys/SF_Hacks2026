import uuid
from datetime import datetime


def new_swipe(
    swiper_id: str,
    swiper_listing_id: str,
    target_listing_id: str,
    direction: str,
) -> dict:
    return {
        "_id": str(uuid.uuid4()),
        "swiper_id": swiper_id,
        "swiper_listing_id": swiper_listing_id,
        "target_listing_id": target_listing_id,
        "direction": direction,           # 'right' | 'left'
        "created_at": datetime.utcnow(),
    }
