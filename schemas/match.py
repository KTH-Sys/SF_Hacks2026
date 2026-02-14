from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from schemas.listing import ListingOut
from schemas.user import UserPublic


class MatchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: str
    confirmed_by_a: bool
    confirmed_by_b: bool
    created_at: datetime
    expires_at: datetime

    listing_a: ListingOut
    listing_b: ListingOut
    user_a: UserPublic
    user_b: UserPublic

    # Which side the current user is on
    my_listing: Optional[ListingOut] = None
    their_listing: Optional[ListingOut] = None
    their_user: Optional[UserPublic] = None


class ConfirmTradeResponse(BaseModel):
    match_id: str
    status: str
    fully_confirmed: bool
    message: str
