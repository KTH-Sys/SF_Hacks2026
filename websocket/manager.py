import json
from collections import defaultdict
from typing import Dict, List, Set

from fastapi import WebSocket


class ConnectionManager:
    """
    In-memory WebSocket connection manager.

    Maps user_id → set of active WebSocket connections.
    A user can have multiple connections (multiple tabs/devices).

    NOTE: This is single-process only. For multi-process production
    deployment, replace with Redis pub/sub adapter.
    """

    def __init__(self):
        # user_id -> set of WebSocket connections
        self._connections: Dict[str, Set[WebSocket]] = defaultdict(set)

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self._connections[user_id].add(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str):
        self._connections[user_id].discard(websocket)
        if not self._connections[user_id]:
            del self._connections[user_id]

    async def send_to_user(self, user_id: str, event: str, data: dict):
        """Send an event to all connections of a specific user."""
        payload = json.dumps({"event": event, "data": data})
        dead = set()

        for ws in self._connections.get(user_id, set()):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.add(ws)

        # Clean up dead connections
        for ws in dead:
            self._connections[user_id].discard(ws)

    async def broadcast_to_users(self, user_ids: List[str], event: str, data: dict):
        """Send an event to multiple users."""
        for user_id in user_ids:
            await self.send_to_user(user_id, event, data)

    def is_online(self, user_id: str) -> bool:
        return bool(self._connections.get(user_id))

    @property
    def online_count(self) -> int:
        return len(self._connections)


# Singleton — imported by routers
ws_manager = ConnectionManager()
