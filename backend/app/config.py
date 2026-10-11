from pathlib import Path
from typing import List, Optional
from urllib.parse import quote_plus, urlsplit, urlunsplit
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "NEPSE Stock Market Intelligence"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Security & JWT
    SECRET_KEY: str = "omway-super-secret-key-change-in-production-stock-market-app"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    
    # Database
    DATABASE_URL: str = f"sqlite+aiosqlite:///{BASE_DIR / 'stock_market.db'}"
    
    # Supabase Direct Configurations
    SUPABASE_DB_HOST: Optional[str] = None
    SUPABASE_DB_PORT: Optional[int] = 5432
    SUPABASE_DB_NAME: Optional[str] = "postgres"
    SUPABASE_DB_USER: Optional[str] = None
    SUPABASE_DB_PASSWORD: Optional[str] = None
    SUPABASE_URL: Optional[str] = None

    # Redis / Queue
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Crawling Settings
    CRAWL_INTERVAL_MINUTES: int = 60
    DEFAULT_USER_AGENT: str = "OmwayStockBot/1.0 (+https://omwaytech.com/bot; research@omwaytech.com)"
    REQUEST_TIMEOUT_SECONDS: float = 15.0
    PER_DOMAIN_RATE_LIMIT_SECONDS: float = 2.0
    
    # Anomaly Detection Settings
    VOLUME_ANOMALY_ZSCORE_THRESHOLD: float = 2.0
    ROLLING_WINDOW_DAYS: int = 20
    
    # Configuration paths
    COMPANIES_CONFIG_PATH: Path = BASE_DIR / "config" / "companies.json"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        if not v:
            return v
        url = str(v).strip()
        # Convert plain postgresql:// or postgres:// to async psycopg driver
        if url.startswith("postgres://"):
            url = "postgresql" + url[8:]
        if url.startswith("postgresql://"):
            url = "postgresql+psycopg://" + url[13:]
        elif url.startswith("postgresql+asyncpg://"):
            # If psycopg is available and on Windows, psycopg is preferable
            import sys
            if sys.platform == "win32":
                url = "postgresql+psycopg://" + url[21:]
        return url

    model_config = SettingsConfigDict(
        env_file=[str(BASE_DIR / ".env"), ".env"],
        env_file_encoding="utf-8",
        extra="allow"
    )

settings = Settings()

