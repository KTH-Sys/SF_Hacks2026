# ── DEV 2 OWNS THIS FILE ──────────────────────────────────────────────────────
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from core.dependencies import get_current_user
from database import get_db, serialize_doc
from models import LISTINGS, MATCHES, MESSAGES, USERS
from models.message import new_message
from schemas.listing import ListingOut
from schemas.match import ConfirmTradeResponse, MatchOut
from schemas.user import UserPublic
from websocket.manager import ws_manager

router = APIRouter(prefix="/matches", tags=["matches"])


async def _build_match_out(match: dict, current_user_id: str, db: AsyncIOMotorDatabase) -> MatchOut:
    """Fetch related listings and users to build a MatchOut response."""
    # Fetch listings
    listing_a_raw = await db[LISTINGS].find_one({"_id": match["listing_a_id"]})
    listing_b_raw = await db[LISTINGS].find_one({"_id": match["listing_b_id"]})
    user_a_raw = await db[USERS].find_one({"_id": match["user_a_id"]})
    user_b_raw = await db[USERS].find_one({"_id": match["user_b_id"]})

    listing_a = ListingOut(**serialize_doc(listing_a_raw)) if listing_a_raw else None
    listing_b = ListingOut(**serialize_doc(listing_b_raw)) if listing_b_raw else None
    user_a = UserPublic(**serialize_doc(user_a_raw)) if user_a_raw else None
    user_b = UserPublic(**serialize_doc(user_b_raw)) if user_b_raw else None

    # Determine perspective
    if current_user_id == match["user_a_id"]:
        my_listing, their_listing, their_user = listing_a, listing_b, user_b
    else:
        my_listing, their_listing, their_user = listing_b, listing_a, user_a

    return MatchOut(
        id=match["id"],
        status=match["status"],
        confirmed_by_a=match["confirmed_by_a"],
        confirmed_by_b=match["confirmed_by_b"],
        created_at=match["created_at"],
        expires_at=match["expires_at"],
        listing_a=listing_a,
        listing_b=listing_b,
        user_a=user_a,
        user_b=user_b,
        my_listing=my_listing,
        their_listing=their_listing,
        their_user=their_user,
    )


@router.get("/", response_model=List[MatchOut])
async def get_my_matches(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Return all active/confirmed matches for the current user."""
    cursor = db[MATCHES].find({
        "$or": [
            {"user_a_id": current_user["id"]},
            {"user_b_id": current_user["id"]},
        ],
        "status": {"$in": ["active", "confirmed"]},
    }).sort("created_at", -1)

    raw_matches = await cursor.to_list(length=50)
    results = []
    for raw in raw_matches:
        match = serialize_doc(raw)
        results.append(await _build_match_out(match, current_user["id"], db))
    return results


@router.get("/{match_id}", response_model=MatchOut)
async def get_match(
    match_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Return a single match (must be a participant)."""
    match = await _get_match_or_403(match_id, current_user["id"], db)
    return await _build_match_out(match, current_user["id"], db)


@router.post("/{match_id}/confirm", response_model=ConfirmTradeResponse)
async def confirm_trade(
    match_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Confirm the trade. When both parties confirm, match → confirmed, listings → traded."""
    match = await _get_match_or_403(match_id, current_user["id"], db)

    if match["status"] not in ("active", "confirmed"):
        raise HTTPException(status_code=400, detail=f"Cannot confirm match with status '{match['status']}'")

    # Determine which flag to set
    if current_user["id"] == match["user_a_id"]:
        flag = "confirmed_by_a"
        other_user_id = match["user_b_id"]
    else:
        flag = "confirmed_by_b"
        other_user_id = match["user_a_id"]

    # Set the flag
    await db[MATCHES].update_one(
        {"_id": match_id},
        {"$set": {flag: True}},
    )

    # Re-fetch updated match
    updated_raw = await db[MATCHES].find_one({"_id": match_id})
    updated = serialize_doc(updated_raw)

    fully_confirmed = updated["confirmed_by_a"] and updated["confirmed_by_b"]

    if fully_confirmed:
        # Set match status to confirmed
        await db[MATCHES].update_one(
            {"_id": match_id},
            {"$set": {"status": "confirmed"}},
        )
        # Set both listings to traded
        await db[LISTINGS].update_many(
            {"_id": {"$in": [match["listing_a_id"], match["listing_b_id"]]}},
            {"$set": {"status": "traded"}},
        )
        # System message
        sys_msg = new_message(
            match_id=match_id,
            sender_id="system",
            content="✅ Trade confirmed by both parties!",
            msg_type="system",
        )
        await db[MESSAGES].insert_one(sys_msg)
        # Notify both users
        await ws_manager.broadcast_to_users(
            user_ids=[match["user_a_id"], match["user_b_id"]],
            event="trade_confirmed",
            data={"match_id": match_id},
        )
        return ConfirmTradeResponse(
            match_id=match_id,
            status="confirmed",
            fully_confirmed=True,
            message="Trade confirmed by both parties! 🎉",
        )
    else:
        # Notify the other user
        await ws_manager.send_to_user(
            user_id=other_user_id,
            event="trade_confirmation_pending",
            data={"match_id": match_id},
        )
        return ConfirmTradeResponse(
            match_id=match_id,
            status="active",
            fully_confirmed=False,
            message="Your confirmation recorded. Waiting for the other party.",
        )


@router.post("/{match_id}/cancel", status_code=204)
async def cancel_match(
    match_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Cancel a match (not allowed once fully confirmed)."""
    match = await _get_match_or_403(match_id, current_user["id"], db)

    if match["status"] == "confirmed":
        raise HTTPException(status_code=400, detail="Cannot cancel a fully confirmed trade")

    # Set match to cancelled
    await db[MATCHES].update_one(
        {"_id": match_id},
        {"$set": {"status": "cancelled"}},
    )

    # Revert both listings to active
    await db[LISTINGS].update_many(
        {"_id": {"$in": [match["listing_a_id"], match["listing_b_id"]]}},
        {"$set": {"status": "active"}},
    )

    # System message
    sys_msg = new_message(
        match_id=match_id,
        sender_id="system",
        content=f"❌ {current_user.get('display_name', 'A user')} cancelled this trade.",
        msg_type="system",
    )
    await db[MESSAGES].insert_one(sys_msg)

    # Notify the other user
    other_user_id = (
        match["user_b_id"] if current_user["id"] == match["user_a_id"] else match["user_a_id"]
    )
    await ws_manager.send_to_user(
        user_id=other_user_id,
        event="match_cancelled",
        data={"match_id": match_id},
    )


# ─── Helper ───────────────────────────────────────────────────────────────────

async def _get_match_or_403(match_id: str, user_id: str, db: AsyncIOMotorDatabase) -> dict:
    """Fetch match by _id and verify current user is a participant."""
    raw = await db[MATCHES].find_one({"_id": match_id})
    if not raw:
        raise HTTPException(status_code=404, detail="Match not found")
    match = serialize_doc(raw)
    if user_id not in (match["user_a_id"], match["user_b_id"]):
        raise HTTPException(status_code=403, detail="You are not a participant in this match")
    return match
