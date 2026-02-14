# ── DEV 1 OWNS THIS FILE ──────────────────────────────────────────────────────
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

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
    # TODO:
    # 1. Use payload.latitude or fall back to current_user["latitude"]
    # 2. Call new_listing(...) to build document
    # 3. Insert into db[LISTINGS]
    # 4. Return ListingOut(**serialize_doc(doc))
    raise NotImplementedError


@router.get("/mine", response_model=List[ListingOut])
async def get_my_listings(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # TODO:
    # Find all listings where user_id == current_user["id"] and status != "deleted"
    # Sort by created_at descending
    raise NotImplementedError


@router.get("/deck", response_model=List[SwipeDeckItem])
async def get_swipe_deck(
    offering_listing_id: str = Query(..., description="Your listing ID you are offering"),
    category: Optional[str] = Query(None),
    radius_km: Optional[float] = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # TODO:
    # 1. Fetch my_listing by offering_listing_id (must belong to current_user, status=="active")
    # 2. Call await build_swipe_deck(db, current_user, my_listing, category, radius_km)
    # 3. Return the deck list
    raise NotImplementedError


@router.get("/{listing_id}", response_model=ListingOut)
async def get_listing(
    listing_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # TODO:
    # 1. Find listing by _id where status != "deleted"
    # 2. Increment view_count if not owner
    # 3. Inject distance_km using haversine_km if both have coordinates
    raise NotImplementedError


@router.patch("/{listing_id}", response_model=ListingOut)
async def update_listing(
    listing_id: str,
    payload: ListingUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # TODO:
    # 1. Find listing by _id where user_id == current_user["id"]
    # 2. $set payload fields + updated_at
    # 3. Return updated document
    raise NotImplementedError


@router.delete("/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_listing(
    listing_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # TODO: Set status = "deleted" (soft delete)
    raise NotImplementedError
