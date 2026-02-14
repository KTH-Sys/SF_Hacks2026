from typing import List, Optional
from datetime import datetime
import json

from pydantic import BaseModel, ConfigDict, Field, field_validator
from models import CATEGORIES, CONDITIONS


class ListingCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    category: str
    condition: str
    estimated_value: float = Field(gt=0)
    images: List[str] = Field(default_factory=list, max_length=6)  # base64 or URLs
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    @field_validator("category")
    @classmethod
    def validate_category(cls, v):
        if v not in CATEGORIES:
            raise ValueError(f"category must be one of: {CATEGORIES}")
        return v

    @field_validator("condition")
    @classmethod
    def validate_condition(cls, v):
        if v not in CONDITIONS:
            raise ValueError(f"condition must be one of: {CONDITIONS}")
        return v


class ListingUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    category: Optional[str] = None
    condition: Optional[str] = None
    estimated_value: Optional[float] = Field(None, gt=0)
    images: Optional[List[str]] = None


class ListingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    title: str
    description: Optional[str]
    category: str
    condition: str
    estimated_value: float
    images: List[str]
    latitude: Optional[float]
    longitude: Optional[float]
    status: str
    view_count: int
    created_at: datetime
    distance_km: Optional[float] = None  # injected at query time

    @field_validator("images", mode="before")
    @classmethod
    def parse_images(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return []
        return v or []


class SwipeDeckItem(ListingOut):
    """Listing card shown in swipe deck, includes owner public info."""
    owner_name: str
    owner_avatar: Optional[str]
    owner_rating: float
    owner_trade_count: int
