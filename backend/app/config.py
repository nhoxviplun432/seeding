from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Facebook API
    FACEBOOK_APP_ID: str
    FACEBOOK_APP_SECRET: str
    FACEBOOK_PAGE_ID: str
    FACEBOOK_PAGE_ACCESS_TOKEN: str
    FACEBOOK_API_VERSION: str = "v19.0"

    # File Storage
    UPLOAD_DIR: str = "frontend/public/uploads"
    MAX_VIDEO_SIZE: int = 10_737_418_240  # 10 GB

    # Security
    SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
