from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from database import connect_db, disconnect_db
from routers import ai, auth, chat, listings, matches, swipes


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────────────────────
    await connect_db()

    if settings.VISION_ENABLED:
        try:
            from services.vision import load_model
            load_model()
        except Exception as e:
            print(f"⚠️  PyTorch vision model failed to load: {e}")
            print("   Vision endpoints will return 503. Set VISION_ENABLED=false to suppress.")

    yield
    # ── Shutdown ─────────────────────────────────────────────────────────────
    await disconnect_db()


app = FastAPI(
    title=settings.APP_NAME,
    description="Barter — Trade what you have for what you want.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(listings.router)
app.include_router(swipes.router)
app.include_router(matches.router)
app.include_router(chat.router)
app.include_router(ai.router)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "db": settings.MONGODB_DB,
        "gemini": bool(settings.GEMINI_API_KEY),
        "vision": settings.VISION_ENABLED,
    }
