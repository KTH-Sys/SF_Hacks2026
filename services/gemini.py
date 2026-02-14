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
    prompt = f"""
You are estimating fair market value for a used item in USD.
Return ONLY valid JSON (no markdown, no code fence) with exactly these keys:
{{
  "min_value": number,
  "max_value": number,
  "suggested_value": number,
  "reasoning": string,
  "confidence": "low" | "medium" | "high"
}}

Item details:
- title: {title}
- category: {category}
- condition: {condition}
- description: {description or "N/A"}
""".strip()

    client = _get_client()
    try:
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
        )
    except Exception as e:
        raise RuntimeError(f"Gemini request failed: {e}") from e

    text = (response.text or "").strip()
    if not text:
        raise RuntimeError("Gemini returned an empty response")

    if text.startswith("```"):
        text = text.strip("`").strip()
        if text.startswith("json"):
            text = text[4:].strip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise RuntimeError("Gemini returned non-JSON output")
        try:
            data = json.loads(text[start : end + 1])
        except json.JSONDecodeError as e:
            raise RuntimeError(f"Failed to parse Gemini JSON: {e}") from e

    try:
        result = {
            "min_value": float(data["min_value"]),
            "max_value": float(data["max_value"]),
            "suggested_value": float(data["suggested_value"]),
            "reasoning": str(data["reasoning"]).strip(),
            "confidence": str(data["confidence"]).strip().lower(),
        }
    except KeyError as e:
        raise RuntimeError(f"Gemini response missing key: {e}") from e
    except (TypeError, ValueError) as e:
        raise RuntimeError(f"Gemini response has invalid value types: {e}") from e

    if result["min_value"] > result["max_value"]:
        result["min_value"], result["max_value"] = result["max_value"], result["min_value"]
    if result["suggested_value"] < result["min_value"]:
        result["suggested_value"] = result["min_value"]
    if result["suggested_value"] > result["max_value"]:
        result["suggested_value"] = result["max_value"]
    if result["confidence"] not in {"low", "medium", "high"}:
        result["confidence"] = "medium"

    return result


async def generate_description(title: str, category: str, condition: str) -> str:
    """
    Ask Gemini to write a 2-3 sentence listing description for a used item.
    Should NOT include price. Returns plain text string.

    TODO:
    1. Build a prompt with item details
    2. Call generate_content
    3. Return response.text.strip()
    """
    prompt = f"""
Write a compelling 2-3 sentence listing description for a used item.
Do not include any price, bullet points, markdown, or hashtags.

Item details:
- title: {title}
- category: {category}
- condition: {condition}
""".strip()

    client = _get_client()
    try:
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
        )
    except Exception as e:
        raise RuntimeError(f"Gemini request failed: {e}") from e

    text = (response.text or "").strip()
    if not text:
        raise RuntimeError("Gemini returned an empty response")
    return text
