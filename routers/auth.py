# ── DEV 1 OWNS THIS FILE ──────────────────────────────────────────────────────
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from core.dependencies import get_current_user
from core.security import create_access_token, hash_password, verify_password
from database import get_db, serialize_doc
from models import USERS
from models.user import new_user
from schemas.user import TokenResponse, UserLogin, UserPrivate, UserRegister, UserUpdate

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister, db: AsyncIOMotorDatabase = Depends(get_db)):
    # TODO:
    # 1. Call new_user() to build a user document
    # 2. Insert into db[USERS] — catch DuplicateKeyError for duplicate email
    # 3. Return TokenResponse with create_access_token(subject=user["id"])
    raise NotImplementedError


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, db: AsyncIOMotorDatabase = Depends(get_db)):
    # TODO:
    # 1. Find user by email in db[USERS]
    # 2. Verify password with verify_password()
    # 3. Return TokenResponse with token
    raise NotImplementedError


@router.get("/me", response_model=UserPrivate)
async def get_me(current_user: dict = Depends(get_current_user)):
    # TODO: Return UserPrivate(**current_user)
    raise NotImplementedError


@router.patch("/me", response_model=UserPrivate)
async def update_me(
    payload: UserUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # TODO:
    # 1. Build updates dict from payload.dict(exclude_unset=True)
    # 2. Add "updated_at": datetime.utcnow()
    # 3. db[USERS].update_one({"_id": current_user["id"]}, {"$set": updates})
    # 4. Re-fetch and return updated user
    raise NotImplementedError
