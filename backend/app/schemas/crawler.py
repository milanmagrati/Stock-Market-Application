from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class CrawlLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    portal: str
    crawl_type: str
    status: str
    items_crawled: int
    error_message: Optional[str] = None
    started_at: datetime
    finished_at: Optional[datetime] = None

class CrawlTriggerRequest(BaseModel):
    portal: Optional[str] = "all"  # "all", "merolagani.com", "sharesansar.com", "nepsealpha.com", "bizmandu.com"
    crawl_type: Optional[str] = "NEWS"  # "NEWS", "OHLCV", "FLOORSHEET"

class CrawlTriggerResponse(BaseModel):
    task_id: str
    message: str
    status: str
    timestamp: datetime

class SchedulerStatusOut(BaseModel):
    is_active: bool
    interval_minutes: int
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    total_scheduled_runs: int
    message: str

class SchedulerToggleRequest(BaseModel):
    enabled: bool

class SchedulerIntervalRequest(BaseModel):
    interval_minutes: int
