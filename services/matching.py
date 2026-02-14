# ── DEV 1 OWNS THIS FILE ──────────────────────────────────────────────────────
from typing import List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from core.config import settings
from database import serialize_doc
from models import LISTINGS, SWIPES, USERS
from schemas.listing import SwipeDeckItem
from services.geo import haversine_km


def value_range_filter(
    base_value: float, tolerance: float = settings.VALUE_TOLERANCE_PERCENT
) -> tuple:
    """Returns (low, high) value bounds. e.g. $100 ± 30% → ($70, $130)."""
    return base_value * (1 - tolerance), base_value * (1 + tolerance)


async def build_swipe_deck(
    db: AsyncIOMotorDatabase,
    current_user: dict,
    my_listing: dict,
    category_filter: Optional[str],
    radius_km: float,
) -> List[SwipeDeckItem]:
    """
    Returns a ranked list of listings for the swipe deck.

    Filters to apply (in order):
      1. Exclude current_user's own listings
      2. status == "active"
      3. category matches my_listing["category"] (or category_filter if provided)
      4. estimated_value within ±VALUE_TOLERANCE_PERCENT of my_listing value
      5. _id not in IDs already swiped on by this user+listing pair
      6. Within radius_km using haversine_km (geo post-filter in Python)

    For each candidate:
      - Fetch owner from db[USERS]
      - Build a SwipeDeckItem (see schemas/listing.py for fields)

    Sort by distance_km ascending (None distances go last).
    Return up to MAX_SWIPE_DECK_SIZE items.

    Hint — async for loop over a Motor cursor:
        async for doc in db[LISTINGS].find(filter):
            ...

    Hint — already-swiped IDs:
        already_swiped_cursor = db[SWIPES].find(
            {"swiper_id": current_user["id"], "swiper_listing_id": my_listing["id"]},
            {"target_listing_id": 1},
        )
        swiped_ids = {doc["target_listing_id"] async for doc in already_swiped_cursor}
    """
    target_category = category_filter or my_listing["category"]
    low_value, high_value = value_range_filter(float(my_listing["estimated_value"]))

    already_swiped_cursor = db[SWIPES].find(
        {"swiper_id": current_user["id"], "swiper_listing_id": my_listing["id"]},
        {"target_listing_id": 1},
    )
    swiped_ids = {doc["target_listing_id"] async for doc in already_swiped_cursor}

    query = {
        "user_id": {"$ne": current_user["id"]},
        "status": "active",
        "category": target_category,
        "estimated_value": {"$gte": low_value, "$lte": high_value},
    }
    if swiped_ids:
        query["_id"] = {"$nin": list(swiped_ids)}

    origin_lat = (
        my_listing.get("latitude")
        if my_listing.get("latitude") is not None
        else current_user.get("latitude")
    )
    origin_lon = (
        my_listing.get("longitude")
        if my_listing.get("longitude") is not None
        else current_user.get("longitude")
    )

    deck: List[SwipeDeckItem] = []
    async for raw_candidate in db[LISTINGS].find(query):
        candidate = serialize_doc(raw_candidate)
        distance_km = None

        candidate_lat = candidate.get("latitude")
        candidate_lon = candidate.get("longitude")
        if (
            origin_lat is not None
            and origin_lon is not None
            and candidate_lat is not None
            and candidate_lon is not None
        ):
            distance_km = haversine_km(origin_lat, origin_lon, candidate_lat, candidate_lon)
            if distance_km > radius_km:
                continue

        owner_raw = await db[USERS].find_one({"_id": candidate["user_id"]})
        if not owner_raw:
            continue
        owner = serialize_doc(owner_raw)

        candidate["distance_km"] = distance_km
        deck.append(
            SwipeDeckItem(
                **candidate,
                owner_name=owner.get("display_name", "Unknown"),
                owner_avatar=owner.get("avatar_url"),
                owner_rating=float(owner.get("rating_avg", 0.0)),
                owner_trade_count=int(owner.get("rating_count", 0)),
            )
        )

    deck.sort(key=lambda item: (item.distance_km is None, item.distance_km or float("inf")))
    return deck[: settings.MAX_SWIPE_DECK_SIZE]
