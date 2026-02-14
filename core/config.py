from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "Barter"
    DEBUG: bool = True

    # MongoDB Atlas
    MONGODB_URL: str = "mongodb://localhost:27017"   # override with Atlas URI in .env
    MONGODB_DB: str = "barter"

    # Auth
    SECRET_KEY: str = "changeme-use-a-real-secret-in-prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days for hackathon

    # Gemini
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # PyTorch — set False to skip model load on slow machines
    VISION_ENABLED: bool = True

    # Trade matching
    DEFAULT_RADIUS_KM: float = 25.0
    VALUE_TOLERANCE_PERCENT: float = 0.30   # ±30% value range
    MAX_SWIPE_DECK_SIZE: int = 50

    # Upload
    MAX_IMAGES_PER_LISTING: int = 6


settings = Settings()
