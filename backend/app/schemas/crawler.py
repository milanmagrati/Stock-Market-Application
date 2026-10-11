from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, field_serializer

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

    @field_serializer("started_at", "finished_at", when_used="json")
    def serialize_datetime(self, dt: Optional[datetime]) -> Optional[str]:
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()

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
