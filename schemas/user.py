from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    display_name: str = Field(min_length=1, max_length=50)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=50)
    bio: Optional[str] = Field(None, max_length=280)
    avatar_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    city: Optional[str] = None
    trade_radius_km: Optional[float] = Field(None, ge=1, le=500)


class UserPublic(BaseModel):
    id: str
    display_name: str
    avatar_url: Optional[str]
    bio: Optional[str]
    city: Optional[str]
    rating_avg: float
    rating_count: int
    is_verified: bool

    class Config:
        from_attributes = True


class UserPrivate(UserPublic):
    email: str
    latitude: Optional[float]
    longitude: Optional[float]
    trade_radius_km: float

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPrivate
