# ── DEV 1 OWNS THIS FILE ──────────────────────────────────────────────────────
"""
PyTorch vision service.
Loads MobileNetV2 pretrained on ImageNet once at startup.
Maps the top ImageNet prediction to one of our listing categories.

Model loads in ~2s on CPU. Set VISION_ENABLED=false in .env to skip.
"""
import base64
import io
import logging

import torch
import torch.nn.functional as F
from PIL import Image
from torchvision import models, transforms

logger = logging.getLogger(__name__)

# Map ImageNet label keywords → our categories
# Add more mappings as needed
_LABEL_TO_CATEGORY = {
    "laptop": "electronics",   "cell_phone": "electronics",  "television": "electronics",
    "monitor": "electronics",  "speaker": "electronics",     "headphone": "electronics",
    "joystick": "gaming",      "jersey": "clothing",         "suit": "clothing",
    "boot": "clothing",        "sandal": "clothing",         "backpack": "clothing",
    "book_jacket": "books",    "desk": "furniture",          "chair": "furniture",
    "bicycle": "sports",       "basketball": "sports",       "tennis_ball": "sports",
    "dumbbell": "sports",      "skateboard": "sports",       "surfboard": "sports",
    "acoustic_guitar": "instruments", "violin": "instruments", "piano": "instruments",
    "tent": "outdoor",         "paintbrush": "art",
}

_TRANSFORM = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

_model = None
_labels: list = []


def load_model():
    """
    Load MobileNetV2 + ImageNet class labels.
    Called once at startup from main.py lifespan.

    TODO:
    1. Load model: models.mobilenet_v2(weights=models.MobileNet_V2_Weights.IMAGENET1K_V1)
    2. Set model.eval()
    3. Fetch labels from:
       https://raw.githubusercontent.com/pytorch/hub/master/imagenet_classes.txt
    4. Store both in module-level _model and _labels
    """
    global _model, _labels

    weights = models.MobileNet_V2_Weights.IMAGENET1K_V1
    _model = models.mobilenet_v2(weights=weights)
    _model.eval()

    # Prefer torchvision's built-in class list to avoid network dependency.
    _labels = list(weights.meta.get("categories", []))
    if not _labels:
        raise RuntimeError("Failed to load ImageNet labels for vision model.")

    logger.info("Vision model loaded with %d labels", len(_labels))


def classify_image(image_b64: str) -> dict:
    """
    Classify a base64-encoded image.

    Returns:
        {
            "category": str,          # e.g. "electronics"
            "imagenet_label": str,    # e.g. "laptop"
            "confidence": float,      # 0.0 – 1.0
            "top5": list[dict]        # [{label, score}, ...]
        }

    TODO:
    1. Strip "data:image/...;base64," prefix if present
    2. base64.b64decode → PIL Image → apply _TRANSFORM → unsqueeze(0)
    3. torch.no_grad() → _model(tensor) → F.softmax → torch.topk(probs, 5)
    4. Map top label to category using _map_label()
    5. If top-1 maps to "other", try top-2 through top-5 for a better match
    """
    if _model is None:
        raise RuntimeError("Vision model not loaded. Call load_model() first.")
    if not image_b64:
        raise ValueError("image_b64 is required")

    if "," in image_b64 and image_b64.split(",", 1)[0].startswith("data:image/"):
        image_b64 = image_b64.split(",", 1)[1]

    try:
        image_bytes = base64.b64decode(image_b64)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as e:
        raise ValueError(f"Invalid image payload: {e}") from e

    tensor = _TRANSFORM(image).unsqueeze(0)

    with torch.no_grad():
        logits = _model(tensor)
        probs = F.softmax(logits, dim=1).squeeze(0)
        top_probs, top_indices = torch.topk(probs, 5)

    top5 = []
    for score, idx in zip(top_probs.tolist(), top_indices.tolist()):
        label = _labels[idx] if idx < len(_labels) else str(idx)
        top5.append({"label": label, "score": float(score)})

    top_label = top5[0]["label"]
    category = _map_label(top_label)
    if category == "other":
        for candidate in top5[1:]:
            candidate_category = _map_label(candidate["label"])
            if candidate_category != "other":
                category = candidate_category
                break

    return {
        "category": category,
        "imagenet_label": top_label,
        "confidence": float(top5[0]["score"]),
        "top5": top5,
    }


def _map_label(label: str) -> str:
    """Return Barter category for an ImageNet label, or 'other' if no match."""
    label_lower = label.lower()
    for key, cat in _LABEL_TO_CATEGORY.items():
        if key in label_lower or label_lower in key:
            return cat
    return "other"
