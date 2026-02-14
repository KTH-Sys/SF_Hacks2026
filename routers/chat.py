# ── DEV 2 OWNS THIS FILE ──────────────────────────────────────────────────────
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from motor.motor_asyncio import AsyncIOMotorDatabase

from core.dependencies import get_current_user
from core.security import decode_access_token
from database import get_db, serialize_doc
from models import MATCHES, MESSAGES, USERS
from models.message import new_message
from schemas.message import ChatHistory, MessageCreate, MessageOut
from websocket.manager import ws_manager

router = APIRouter(prefix="/chat", tags=["chat"])


# ─── REST: message history ─────────────────────────────────────────────────────

@router.get("/{match_id}/messages", response_model=ChatHistory)
async def get_messages(
    match_id: str,
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Return paginated message history for a match.

    TODO:
    1. Call await _assert_match_member(match_id, current_user["id"], db)
    2. Query db[MESSAGES] where match_id==match_id, sort created_at asc,
       .skip(offset).limit(limit) → to_list(length=limit)
    3. count_documents for total
    4. For each msg: serialize_doc then await _enrich_message(msg, db)
    5. Return ChatHistory(match_id, messages=enriched, total=total)
    """
    # TODO: implement
    raise NotImplementedError


# ─── REST: send message (fallback for non-WS clients) ─────────────────────────

@router.post("/{match_id}/messages", response_model=MessageOut)
async def send_message_rest(
    match_id: str,
    payload: MessageCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Send a message over REST (fallback — prefer WebSocket).

    TODO:
    1. match = await _assert_match_member(match_id, current_user["id"], db)
    2. If match["status"] not in ("active","confirmed"): raise HTTP 400
    3. new_message(match_id, sender_id, content, msg_type=payload.type) → insert
    4. _enrich_message to get msg_out
    5. Broadcast via ws_manager.broadcast_to_users([current_user, other_user],
       event="new_message", data=msg_out.dict())
    6. Return msg_out
    """
    # TODO: implement
    raise NotImplementedError


# ─── WebSocket ─────────────────────────────────────────────────────────────────

@router.websocket("/ws/{match_id}")
async def websocket_chat(
    websocket: WebSocket,
    match_id: str,
    token: Optional[str] = Query(None),
):
    """
    Connect: ws://host/chat/ws/{match_id}?token=<jwt>

    Client sends:  {"type": "message", "content": "Hello!"}
                   {"type": "ping"}
    Server pushes: {"event": "new_message", "data": {...MessageOut...}}
                   {"event": "pong"}

    TODO:
    1. decode_access_token(token) → user_id; close(4001) if None
    2. Fetch user from db[USERS] (active); close(4001) if not found
    3. Fetch match from db[MATCHES]; close(4004) if not found
    4. Verify user is participant; close(4003) if not
    5. await ws_manager.connect(websocket, user_id)
    6. Loop: await websocket.receive_json()
       - type=="message": re-fetch match status, insert message, enrich,
         broadcast to both users
       - type=="ping": send_json({"event": "pong"})
    7. except WebSocketDisconnect: ws_manager.disconnect(websocket, user_id)
    """
    # TODO: implement
    pass


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def _assert_match_member(match_id: str, user_id: str, db: AsyncIOMotorDatabase) -> dict:
    """
    Fetch match and verify user is a participant.

    TODO:
    1. raw = await db[MATCHES].find_one({"_id": match_id}) — 404 if None
    2. match = serialize_doc(raw)
    3. If user_id not in (match["user_a_id"], match["user_b_id"]): raise HTTP 403
    4. Return match
    """
    # TODO: implement
    raise NotImplementedError


async def _enrich_message(msg: dict, db: AsyncIOMotorDatabase) -> MessageOut:
    """
    Add sender_name to a message dict and return MessageOut.

    TODO:
    1. Fetch sender from db[USERS] by msg["sender_id"]
    2. sender_name = serialize_doc(sender_raw)["display_name"] if found else "System"
    3. Return MessageOut(id, match_id, sender_id, sender_name, content, type, created_at)
    """
    # TODO: implement
    raise NotImplementedError
