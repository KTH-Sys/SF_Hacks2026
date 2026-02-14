# ── DEV 1 OWNS THIS FILE ──────────────────────────────────────────────────────
"""
AI endpoints — Gemini + PyTorch

POST /ai/estimate-value    → Gemini value estimation from item details
POST /ai/generate-desc     → Gemini listing description generator
POST /ai/classify-image    → PyTorch MobileNetV2 category detection from base64 image
"""
import asyncio
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.config import settings
from core.dependencies import get_current_user

router = APIRouter(prefix="/ai", tags=["ai"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class ValueEstimateRequest(BaseModel):
    title: str
    category: str
    condition: str
    description: Optional[str] = None


class ValueEstimateResponse(BaseModel):
    min_value: float
    max_value: float
    suggested_value: float
    reasoning: str
    confidence: str


class DescriptionRequest(BaseModel):
    title: str
    category: str
    condition: str


class DescriptionResponse(BaseModel):
    description: str


class ClassifyImageRequest(BaseModel):
    image_b64: str   # base64 string, with or without "data:image/...;base64," prefix


class ClassifyImageResponse(BaseModel):
    category: str
    imagenet_label: str
    confidence: float
    top5: list


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/estimate-value", response_model=ValueEstimateResponse)
async def estimate_value(
    payload: ValueEstimateRequest,
    _: dict = Depends(get_current_user),   # auth required
):
    """Use Gemini to estimate fair market value for a used item."""
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="Gemini service is not configured")

    from services.gemini import estimate_value as gemini_estimate

    try:
        result = await gemini_estimate(
            title=payload.title,
            category=payload.category,
            condition=payload.condition,
            description=payload.description,
        )
        return ValueEstimateResponse(**result)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.post("/generate-desc", response_model=DescriptionResponse)
async def generate_description(
    payload: DescriptionRequest,
    _: dict = Depends(get_current_user),
):
    """Use Gemini to write a 2-3 sentence listing description."""
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="Gemini service is not configured")

    from services.gemini import generate_description as gemini_desc

    try:
        text = await gemini_desc(
            title=payload.title,
            category=payload.category,
            condition=payload.condition,
        )
        return DescriptionResponse(description=text)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.post("/classify-image", response_model=ClassifyImageResponse)
async def classify_image(
    payload: ClassifyImageRequest,
    _: dict = Depends(get_current_user),
):
    """Run PyTorch MobileNetV2 on the uploaded image to predict item category."""
    if not settings.VISION_ENABLED:
        raise HTTPException(status_code=503, detail="Vision service is disabled")

    from services.vision import classify_image as torch_classify

    try:
        result = await asyncio.to_thread(torch_classify, payload.image_b64)
        return ClassifyImageResponse(**result)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Image processing error: {e}") from e
