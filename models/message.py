import uuid
from datetime import datetime


def new_message(match_id: str, sender_id: str, content: str, msg_type: str = "text") -> dict:
    return {
        "_id": str(uuid.uuid4()),
        "match_id": match_id,
        "sender_id": sender_id,
        "content": content,
        "type": msg_type,                 # text | system | image
        "created_at": datetime.utcnow(),
    }
