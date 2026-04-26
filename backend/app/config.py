from pydantic_settings import BaseSettings
from functools import lru_cache

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
    UPLOAD_DIR: str = "/var/www/uploads"
    MAX_VIDEO_SIZE: int = 10737418240  # 10GB
    
    # Security
    SECRET_KEY: str
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()