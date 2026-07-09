from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/orderflow"
    redis_url: str = "redis://localhost:6379/0"
    openai_api_key: str = ""
    secret_key: str = "change-this-secret-key-in-production"
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    model_config = {"env_file": ".env", "case_sensitive": False}


settings = Settings()
