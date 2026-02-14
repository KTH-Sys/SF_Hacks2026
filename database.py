from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING

from core.config import settings

# Module-level client — initialized once at startup
_client: AsyncIOMotorClient = None


def get_db() -> AsyncIOMotorDatabase:
    """Return the Motor database instance. Call after connect_db()."""
    return _client[settings.MONGODB_DB]


async def connect_db():
    """Open the MongoDB connection and create all indexes."""
    global _client
    _client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = _client[settings.MONGODB_DB]

    # users
    await db.users.create_index("email", unique=True)

    # listings
    await db.listings.create_index([("status", ASCENDING), ("category", ASCENDING)])
    await db.listings.create_index([("user_id", ASCENDING)])
    await db.listings.create_index([("estimated_value", ASCENDING)])

    # swipes — unique per (swiper_id, swiper_listing_id, target_listing_id)
    await db.swipes.create_index(
        [
            ("swiper_id", ASCENDING),
            ("swiper_listing_id", ASCENDING),
            ("target_listing_id", ASCENDING),
        ],
        unique=True,
    )
    await db.swipes.create_index(
        [("target_listing_id", ASCENDING), ("direction", ASCENDING)]
    )

    # matches
    await db.matches.create_index([("user_a_id", ASCENDING), ("status", ASCENDING)])
    await db.matches.create_index([("user_b_id", ASCENDING), ("status", ASCENDING)])

    # messages
    await db.messages.create_index(
        [("match_id", ASCENDING), ("created_at", ASCENDING)]
    )

    print(f"✅ MongoDB connected — db: '{settings.MONGODB_DB}', indexes created")


async def disconnect_db():
    global _client
    if _client:
        _client.close()


def serialize_doc(doc: dict) -> dict:
    """Rename MongoDB _id → id and convert to str."""
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id", ""))
    return doc


def serialize_docs(docs: list) -> list:
    return [serialize_doc(d) for d in docs]
