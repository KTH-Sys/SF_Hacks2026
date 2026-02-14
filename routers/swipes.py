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
    """
    Record a swipe (left or right) on a target listing.

    TODO:
    1. Fetch my_listing from db[LISTINGS] where _id==payload.swiper_listing_id,
       user_id==current_user["id"], status=="active" — 404 if missing
    2. Fetch target listing where _id==payload.target_listing_id, status=="active" — 404 if missing
    3. If target["user_id"] == current_user["id"]: raise HTTP 400 "Cannot swipe on your own listing"
    4. Build swipe_doc with new_swipe(...) and insert into db[SWIPES]
       - Catch DuplicateKeyError: fetch existing swipe, return SwipeResult(match_created=False, message="Already swiped")
    5. If payload.direction == "right":
       - Call await _check_and_create_match(db, current_user, my_listing, target)
         to get match_id (or None)
    6. Return SwipeResult(swipe_id, direction, match_created, match_id,
       message="It's a match! 🎉" if match_id else "Swipe recorded")

    Note: serialize_doc() both listing dicts before passing to _check_and_create_match.
    """
    # TODO: implement
    raise NotImplementedError


async def _check_and_create_match(
    db: AsyncIOMotorDatabase,
    current_user: dict,
    my_listing: dict,
    target_listing: dict,
) -> Optional[str]:
    """
    Check if a mutual right-swipe exists and create a match if so.
    Returns the match_id string on success, or None if no mutual swipe.

    TODO:
    1. Query db[SWIPES] for a counter-swipe:
       swiper_id == target_listing["user_id"],
       swiper_listing_id == target_listing["id"],
       target_listing_id == my_listing["id"],
       direction == "right"
       → return None if not found
    2. Check db[MATCHES] for existing match with $or:
       [{listing_a_id: my_listing["id"], listing_b_id: target_listing["id"]},
        {listing_a_id: target_listing["id"], listing_b_id: my_listing["id"]}]
       → return str(existing["_id"]) if found
    3. Create match with new_match(...) and insert into db[MATCHES]
    4. Insert a system message into db[MESSAGES] via new_message(..., msg_type="system")
    5. Set both listings status to "matched" via db[LISTINGS].update_many
    6. Notify both users via ws_manager.broadcast_to_users(
           user_ids=[current_user["id"], target_listing["user_id"]],
           event="new_match",
           data={"match_id": ..., "listing_a_id": ..., "listing_b_id": ...}
       )
    7. Return match_id string
    """
    # TODO: implement
    raise NotImplementedError
