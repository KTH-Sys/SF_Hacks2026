# ── DEV 1 OWNS THIS FILE ──────────────────────────────────────────────────────
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from core.config import settings
from core.dependencies import get_current_user
from database import get_db, serialize_doc, serialize_docs
from models import LISTINGS
from models.listing import new_listing
from schemas.listing import ListingCreate, ListingOut, ListingUpdate, SwipeDeckItem
from services.geo import haversine_km
from services.matching import build_swipe_deck

router = APIRouter(prefix="/listings", tags=["listings"])


@router.post("/", response_model=ListingOut, status_code=status.HTTP_201_CREATED)
async def create_listing(
    payload: ListingCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    latitude = payload.latitude if payload.latitude is not None else current_user.get("latitude")
    longitude = payload.longitude if payload.longitude is not None else current_user.get("longitude")

    listing_doc = new_listing(
        user_id=current_user["id"],
        title=payload.title,
        description=payload.description,
        category=payload.category,
        condition=payload.condition,
        estimated_value=payload.estimated_value,
        images=payload.images,
        latitude=latitude,
        longitude=longitude,
    )
    await db[LISTINGS].insert_one(listing_doc)
    return ListingOut(**serialize_doc(listing_doc))


@router.get("/mine", response_model=List[ListingOut])
async def get_my_listings(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    cursor = db[LISTINGS].find(
        {"user_id": current_user["id"], "status": {"$ne": "deleted"}}
    ).sort("created_at", -1)
    listings = await cursor.to_list(length=100)
    return [ListingOut(**doc) for doc in serialize_docs(listings)]


@router.get("/deck", response_model=List[SwipeDeckItem])
async def get_swipe_deck(
    offering_listing_id: str = Query(..., description="Your listing ID you are offering"),
    category: Optional[str] = Query(None),
    radius_km: Optional[float] = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    my_listing_raw = await db[LISTINGS].find_one(
        {
            "_id": offering_listing_id,
            "user_id": current_user["id"],
            "status": "active",
        }
    )
    if not my_listing_raw:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offering listing not found or inactive",
        )

    my_listing = serialize_doc(my_listing_raw)
    effective_radius = (
        radius_km
        if radius_km is not None
        else current_user.get("trade_radius_km", settings.DEFAULT_RADIUS_KM)
    )
    return await build_swipe_deck(
        db=db,
        current_user=current_user,
        my_listing=my_listing,
        category_filter=category,
        radius_km=effective_radius,
    )


@router.get("/{listing_id}", response_model=ListingOut)
async def get_listing(
    listing_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    listing_raw = await db[LISTINGS].find_one({"_id": listing_id, "status": {"$ne": "deleted"}})
    if not listing_raw:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    listing = serialize_doc(listing_raw)
    if listing["user_id"] != current_user["id"]:
        await db[LISTINGS].update_one({"_id": listing_id}, {"$inc": {"view_count": 1}})
        listing["view_count"] = listing.get("view_count", 0) + 1

    distance_km = None
    if (
        current_user.get("latitude") is not None
        and current_user.get("longitude") is not None
        and listing.get("latitude") is not None
        and listing.get("longitude") is not None
    ):
        distance_km = haversine_km(
            current_user["latitude"],
            current_user["longitude"],
            listing["latitude"],
            listing["longitude"],
        )

    listing["distance_km"] = distance_km
    return ListingOut(**listing)


@router.patch("/{listing_id}", response_model=ListingOut)
async def update_listing(
    listing_id: str,
    payload: ListingUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    listing_raw = await db[LISTINGS].find_one(
        {
            "_id": listing_id,
            "user_id": current_user["id"],
            "status": {"$ne": "deleted"},
        }
    )
    if not listing_raw:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        return ListingOut(**serialize_doc(listing_raw))

    updates["updated_at"] = datetime.utcnow()
    await db[LISTINGS].update_one({"_id": listing_id}, {"$set": updates})
    updated_raw = await db[LISTINGS].find_one({"_id": listing_id})
    return ListingOut(**serialize_doc(updated_raw))


@router.delete("/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_listing(
    listing_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db[LISTINGS].update_one(
        {
            "_id": listing_id,
            "user_id": current_user["id"],
            "status": {"$ne": "deleted"},
        },
        {"$set": {"status": "deleted", "updated_at": datetime.utcnow()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
