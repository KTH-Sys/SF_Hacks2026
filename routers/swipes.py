# ── DEV 2 OWNS THIS FILE ──────────────────────────────────────────────────────
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from core.dependencies import get_current_user
from database import get_db, serialize_doc
from models import LISTINGS, MATCHES, MESSAGES, SWIPES
from models.match import new_match
from models.message import new_message
from models.swipe import new_swipe
from schemas.swipe import SwipeAction, SwipeResult
from websocket.manager import ws_manager

router = APIRouter(prefix="/swipes", tags=["swipes"])


@router.post("/", response_model=SwipeResult)
async def record_swipe(
    payload: SwipeAction,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Record a swipe (left or right) on a target listing."""
    # 1. Fetch my listing
    my_listing_raw = await db[LISTINGS].find_one({
        "_id": payload.swiper_listing_id,
        "user_id": current_user["id"],
        "status": "active",
    })
    if not my_listing_raw:
        raise HTTPException(status_code=404, detail="Your listing not found or inactive")
    my_listing = serialize_doc(my_listing_raw)

    # 2. Fetch target listing
    target_raw = await db[LISTINGS].find_one({
        "_id": payload.target_listing_id,
        "status": "active",
    })
    if not target_raw:
        raise HTTPException(status_code=404, detail="Target listing not found or inactive")
    target = serialize_doc(target_raw)

    # 3. Can't swipe on own listing
    if target["user_id"] == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot swipe on your own listing")

    # 4. Insert swipe
    swipe_doc = new_swipe(
        swiper_id=current_user["id"],
        swiper_listing_id=my_listing["id"],
        target_listing_id=target["id"],
        direction=payload.direction,
    )
    try:
        await db[SWIPES].insert_one(swipe_doc)
    except DuplicateKeyError:
        existing = await db[SWIPES].find_one({
            "swiper_id": current_user["id"],
            "swiper_listing_id": my_listing["id"],
            "target_listing_id": target["id"],
        })
        return SwipeResult(
            swipe_id=str(existing["_id"]),
            direction=existing["direction"],
            match_created=False,
            message="Already swiped",
        )

    # 5. Check for mutual match on right swipe
    match_id = None
    if payload.direction == "right":
        match_id = await _check_and_create_match(db, current_user, my_listing, target)

    # 6. Return result
    return SwipeResult(
        swipe_id=swipe_doc["_id"],
        direction=payload.direction,
        match_created=match_id is not None,
        match_id=match_id,
        message="It's a match! 🎉" if match_id else "Swipe recorded",
    )


async def _check_and_create_match(
    db: AsyncIOMotorDatabase,
    current_user: dict,
    my_listing: dict,
    target_listing: dict,
) -> Optional[str]:
    """Check if a mutual right-swipe exists and create a match if so."""
    # 1. Look for counter-swipe
    counter = await db[SWIPES].find_one({
        "swiper_id": target_listing["user_id"],
        "swiper_listing_id": target_listing["id"],
        "target_listing_id": my_listing["id"],
        "direction": "right",
    })
    if not counter:
        return None

    # 2. Check for existing match
    existing = await db[MATCHES].find_one({
        "$or": [
            {"listing_a_id": my_listing["id"], "listing_b_id": target_listing["id"]},
            {"listing_a_id": target_listing["id"], "listing_b_id": my_listing["id"]},
        ]
    })
    if existing:
        return str(existing["_id"])

    # 3. Create match
    match_doc = new_match(
        listing_a_id=my_listing["id"],
        listing_b_id=target_listing["id"],
        user_a_id=current_user["id"],
        user_b_id=target_listing["user_id"],
    )
    await db[MATCHES].insert_one(match_doc)
    match_id = match_doc["_id"]

    # 4. System message
    sys_msg = new_message(
        match_id=match_id,
        sender_id="system",
        content="🎉 It's a match! You can now chat and arrange your trade.",
        msg_type="system",
    )
    await db[MESSAGES].insert_one(sys_msg)

    # 5. Set both listings to matched
    await db[LISTINGS].update_many(
        {"_id": {"$in": [my_listing["id"], target_listing["id"]]}},
        {"$set": {"status": "matched"}},
    )

    # 6. Notify both users via WebSocket
    await ws_manager.broadcast_to_users(
        user_ids=[current_user["id"], target_listing["user_id"]],
        event="new_match",
        data={
            "match_id": match_id,
            "listing_a_id": my_listing["id"],
            "listing_b_id": target_listing["id"],
        },
    )

    # 7. Return match_id
    return match_id
