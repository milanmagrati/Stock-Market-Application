from pathlib import Path
from typing import List, Optional
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

    model_config = SettingsConfigDict(env_file=".env", extra="allow")

settings = Settings()
