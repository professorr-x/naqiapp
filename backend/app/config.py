from pydantic_settings import BaseSettings
from typing import List
from pathlib import Path

# Get the backend directory path
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"


class Settings(BaseSettings):
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    DEBUG: bool = True
    ALLOWED_ORIGINS: str = "http://localhost:19006,http://localhost:19000"

    # Firebase configuration
    FIREBASE_SERVICE_ACCOUNT_JSON: str = ""  # For production (JSON string from env)
    FIREBASE_SERVICE_ACCOUNT_PATH: str = "firebase-service-account.json"  # For local dev

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = str(ENV_FILE)


settings = Settings()
