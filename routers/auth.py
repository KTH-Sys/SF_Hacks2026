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
    user_doc = new_user(
        email=str(payload.email).lower(),
        hashed_password=hash_password(payload.password),
        display_name=payload.display_name,
    )
    try:
        await db[USERS].insert_one(user_doc)
    except DuplicateKeyError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        ) from e

    token = create_access_token(subject=user_doc["_id"])
    user = UserPrivate(**serialize_doc(user_doc))
    return TokenResponse(access_token=token, user=user)


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, db: AsyncIOMotorDatabase = Depends(get_db)):
    user_raw = await db[USERS].find_one({"email": str(payload.email).lower()})
    if not user_raw or not verify_password(payload.password, user_raw.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    user = serialize_doc(user_raw)
    token = create_access_token(subject=user["id"])
    return TokenResponse(access_token=token, user=UserPrivate(**user))


@router.get("/me", response_model=UserPrivate)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserPrivate(**current_user)


@router.patch("/me", response_model=UserPrivate)
async def update_me(
    payload: UserUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        return UserPrivate(**current_user)

    updates["updated_at"] = datetime.utcnow()
    await db[USERS].update_one({"_id": current_user["id"]}, {"$set": updates})

    user_raw = await db[USERS].find_one({"_id": current_user["id"]})
    if not user_raw:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserPrivate(**serialize_doc(user_raw))
