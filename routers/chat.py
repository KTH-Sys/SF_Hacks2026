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
    """Return paginated message history for a match."""
    await _assert_match_member(match_id, current_user["id"], db)

    cursor = db[MESSAGES].find({"match_id": match_id}).sort("created_at", 1).skip(offset).limit(limit)
    raw_messages = await cursor.to_list(length=limit)

    total = await db[MESSAGES].count_documents({"match_id": match_id})

    enriched = []
    for raw in raw_messages:
        msg = serialize_doc(raw)
        enriched.append(await _enrich_message(msg, db))

    return ChatHistory(match_id=match_id, messages=enriched, total=total)


# ─── REST: send message (fallback for non-WS clients) ─────────────────────────

@router.post("/{match_id}/messages", response_model=MessageOut)
async def send_message_rest(
    match_id: str,
    payload: MessageCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Send a message over REST (fallback — prefer WebSocket)."""
    match = await _assert_match_member(match_id, current_user["id"], db)

    if match["status"] not in ("active", "confirmed"):
        raise HTTPException(status_code=400, detail="Cannot send messages in this match")

    msg_doc = new_message(
        match_id=match_id,
        sender_id=current_user["id"],
        content=payload.content,
        msg_type=payload.type,
    )
    await db[MESSAGES].insert_one(msg_doc)

    msg = serialize_doc(msg_doc)
    msg_out = await _enrich_message(msg, db)

    # Determine other user
    other_user_id = (
        match["user_b_id"] if current_user["id"] == match["user_a_id"] else match["user_a_id"]
    )

    # Broadcast to both users via WebSocket
    await ws_manager.broadcast_to_users(
        user_ids=[current_user["id"], other_user_id],
        event="new_message",
        data=msg_out.model_dump(mode="json"),
    )

    return msg_out


# ─── WebSocket ─────────────────────────────────────────────────────────────────

@router.websocket("/ws/{match_id}")
async def websocket_chat(
    websocket: WebSocket,
    match_id: str,
    token: Optional[str] = Query(None),
):
    """Real-time WebSocket chat for a match."""
    # 1. Authenticate via token
    db = get_db()
    user_id = decode_access_token(token) if token else None
    if not user_id:
        await websocket.close(code=4001, reason="Authentication required")
        return

    # 2. Fetch user
    user_raw = await db[USERS].find_one({"_id": user_id, "status": "active"})
    if not user_raw:
        await websocket.close(code=4001, reason="User not found")
        return
    user = serialize_doc(user_raw)

    # 3. Fetch match
    match_raw = await db[MATCHES].find_one({"_id": match_id})
    if not match_raw:
        await websocket.close(code=4004, reason="Match not found")
        return
    match = serialize_doc(match_raw)

    # 4. Verify user is participant
    if user["id"] not in (match["user_a_id"], match["user_b_id"]):
        await websocket.close(code=4003, reason="Not a participant")
        return

    other_user_id = (
        match["user_b_id"] if user["id"] == match["user_a_id"] else match["user_a_id"]
    )

    # 5. Accept connection
    await ws_manager.connect(websocket, user["id"])

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "")

            if msg_type == "ping":
                await websocket.send_json({"event": "pong"})

            elif msg_type == "message":
                content = data.get("content", "").strip()
                if not content:
                    continue

                # Re-check match status
                current_match_raw = await db[MATCHES].find_one({"_id": match_id})
                if not current_match_raw:
                    continue
                current_match = serialize_doc(current_match_raw)
                if current_match["status"] not in ("active", "confirmed"):
                    await websocket.send_json({
                        "event": "error",
                        "data": {"message": "Match is no longer active"},
                    })
                    continue

                # Insert message
                msg_doc = new_message(
                    match_id=match_id,
                    sender_id=user["id"],
                    content=content,
                    msg_type="text",
                )
                await db[MESSAGES].insert_one(msg_doc)

                msg = serialize_doc(msg_doc)
                msg_out = await _enrich_message(msg, db)

                # Broadcast to both users
                await ws_manager.broadcast_to_users(
                    user_ids=[user["id"], other_user_id],
                    event="new_message",
                    data=msg_out.model_dump(mode="json"),
                )

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, user["id"])
    except Exception:
        ws_manager.disconnect(websocket, user["id"])


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def _assert_match_member(match_id: str, user_id: str, db: AsyncIOMotorDatabase) -> dict:
    """Fetch match and verify user is a participant."""
    raw = await db[MATCHES].find_one({"_id": match_id})
    if not raw:
        raise HTTPException(status_code=404, detail="Match not found")
    match = serialize_doc(raw)
    if user_id not in (match["user_a_id"], match["user_b_id"]):
        raise HTTPException(status_code=403, detail="You are not a participant in this match")
    return match


async def _enrich_message(msg: dict, db: AsyncIOMotorDatabase) -> MessageOut:
    """Add sender_name to a message dict and return MessageOut."""
    sender_name = "System"
    if msg.get("sender_id") and msg["sender_id"] != "system":
        sender_raw = await db[USERS].find_one({"_id": msg["sender_id"]})
        if sender_raw:
            sender = serialize_doc(sender_raw)
            sender_name = sender.get("display_name", "Unknown")

    return MessageOut(
        id=msg["id"],
        match_id=msg["match_id"],
        sender_id=msg["sender_id"],
        sender_name=sender_name,
        content=msg["content"],
        type=msg["type"],
        created_at=msg["created_at"],
    )
