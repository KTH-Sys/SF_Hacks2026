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
    """
    Fetch related listings and users to build a MatchOut response.

    TODO:
    1. Fetch listing_a_raw from db[LISTINGS] by match["listing_a_id"]
    2. Fetch listing_b_raw from db[LISTINGS] by match["listing_b_id"]
    3. Fetch user_a_raw from db[USERS] by match["user_a_id"]
    4. Fetch user_b_raw from db[USERS] by match["user_b_id"]
    5. Convert each to schema using serialize_doc + ListingOut / UserPublic
    6. Determine my_listing / their_listing / their_user based on current_user_id
    7. Return MatchOut(...)
    """
    # TODO: implement
    raise NotImplementedError


@router.get("/", response_model=List[MatchOut])
async def get_my_matches(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Return all active/confirmed matches for the current user.

    TODO:
    1. Query db[MATCHES] with $or: [{user_a_id: id}, {user_b_id: id}]
       and status $in ["active", "confirmed"]
    2. Sort by created_at descending, to_list(length=50)
    3. serialize_doc each, then await _build_match_out for each
    4. Return list
    """
    # TODO: implement
    raise NotImplementedError


@router.get("/{match_id}", response_model=MatchOut)
async def get_match(
    match_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Return a single match (must be a participant).

    TODO:
    1. Call await _get_match_or_403(match_id, current_user["id"], db)
    2. Return await _build_match_out(match, current_user["id"], db)
    """
    # TODO: implement
    raise NotImplementedError


@router.post("/{match_id}/confirm", response_model=ConfirmTradeResponse)
async def confirm_trade(
    match_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Confirm the trade on behalf of the current user.
    When both parties confirm, the match becomes "confirmed" and listings → "traded".

    TODO:
    1. Call _get_match_or_403; check status in ("active","confirmed") else HTTP 400
    2. Determine flag = "confirmed_by_a" or "confirmed_by_b" based on user_a_id
    3. db[MATCHES].update_one({_id: match_id}, {$set: {flag: True}})
    4. Re-fetch updated match; check if both confirmed_by_a and confirmed_by_b
    5. If fully confirmed:
       - Set match status = "confirmed"
       - Set both listings status = "traded"
       - Insert system message "✅ Trade confirmed by both parties!"
       - ws_manager.broadcast_to_users(both user IDs, event="trade_confirmed")
    6. Else:
       - ws_manager.send_to_user(other user, event="trade_confirmation_pending")
    7. Return ConfirmTradeResponse(match_id, status, fully_confirmed, message)
    """
    # TODO: implement
    raise NotImplementedError


@router.post("/{match_id}/cancel", status_code=204)
async def cancel_match(
    match_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Cancel a match (not allowed once fully confirmed).

    TODO:
    1. Call _get_match_or_403; raise HTTP 400 if status == "confirmed"
    2. Set match status = "cancelled"
    3. Set both listings status back to "active"
    4. Insert system message "❌ {display_name} cancelled this trade."
    5. ws_manager.send_to_user(other user, event="match_cancelled", data={match_id})
    """
    # TODO: implement
    raise NotImplementedError


# ─── Helper ───────────────────────────────────────────────────────────────────

async def _get_match_or_403(match_id: str, user_id: str, db: AsyncIOMotorDatabase) -> dict:
    """
    Fetch match by _id and verify current user is a participant.

    TODO:
    1. raw = await db[MATCHES].find_one({"_id": match_id}) — 404 if None
    2. match = serialize_doc(raw)
    3. If user_id not in (match["user_a_id"], match["user_b_id"]): raise HTTP 403
    4. Return match
    """
    # TODO: implement
    raise NotImplementedError
