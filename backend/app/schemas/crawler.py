from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class CrawlLogOut(BaseModel):
    id: int
    portal: str
    crawl_type: str
    status: str
    items_crawled: int
    error_message: Optional[str] = None
    started_at: datetime
    finished_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class CrawlTriggerRequest(BaseModel):
    portal: Optional[str] = "all"  # "all", "merolagani.com", "sharesansar.com", "nepsealpha.com", "bizmandu.com"
    crawl_type: Optional[str] = "NEWS"  # "NEWS", "OHLCV", "FLOORSHEET"

class CrawlTriggerResponse(BaseModel):
    task_id: str
    message: str
    status: str
    timestamp: datetime
