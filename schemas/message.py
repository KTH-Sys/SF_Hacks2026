from typing import List
from datetime import datetime
from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)
    type: str = "text"  # text | image


class MessageOut(BaseModel):
    id: str
    match_id: str
    sender_id: str
    sender_name: str
    content: str
    type: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatHistory(BaseModel):
    match_id: str
    messages: List[MessageOut]
    total: int


# WebSocket event envelope
class WSEvent(BaseModel):
    event: str          # "new_message" | "match_confirmed" | "match_cancelled"
    data: dict
