from typing import Literal, Optional

from pydantic import BaseModel


class SwipeAction(BaseModel):
    swiper_listing_id: str   # which of the current user's listings they're offering
    target_listing_id: str   # which listing they're swiping on
    direction: Literal["right", "left"]


class SwipeResult(BaseModel):
    swipe_id: str
    direction: str
    match_created: bool
    match_id: Optional[str] = None
    message: str
