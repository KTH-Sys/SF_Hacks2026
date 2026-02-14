# ── DEV 1 OWNS THIS FILE ──────────────────────────────────────────────────────
"""
Gemini AI service.
Uses the google-genai SDK: from google import genai

Docs: https://ai.google.dev/gemini-api/docs/quickstart?lang=python
Get key: https://aistudio.google.com/app/apikey
"""
import json
from typing import Optional

from google import genai
from google.genai import types

from core.config import settings


def _get_client() -> genai.Client:
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not set in .env")
    return genai.Client(api_key=settings.GEMINI_API_KEY)


async def estimate_value(
    title: str,
    category: str,
    condition: str,
    description: Optional[str] = None,
) -> dict:
    """
    Ask Gemini to estimate the fair market value of a used item.

    Returns a dict with keys:
        min_value: float
        max_value: float
        suggested_value: float
        reasoning: str
        confidence: "low" | "medium" | "high"

    TODO:
    1. Build a prompt that gives Gemini the item details
    2. Tell it to respond ONLY with a JSON object (no markdown)
    3. Call client.models.generate_content(model=settings.GEMINI_MODEL, contents=prompt)
    4. Parse response.text as JSON — handle JSONDecodeError gracefully
    5. Return the dict

    Hint — strip markdown fences if present:
        if text.startswith("```"):
            text = text.split("```")[1].lstrip("json")
    """
    # TODO: implement
    raise NotImplementedError


async def generate_description(title: str, category: str, condition: str) -> str:
    """
    Ask Gemini to write a 2-3 sentence listing description for a used item.
    Should NOT include price. Returns plain text string.

    TODO:
    1. Build a prompt with item details
    2. Call generate_content
    3. Return response.text.strip()
    """
    # TODO: implement
    raise NotImplementedError
