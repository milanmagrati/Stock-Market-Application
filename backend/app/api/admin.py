from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.database import get_db
from app.models.crawler import CrawlLog
from app.models.user import User, UserRole
from app.schemas.crawler import CrawlLogOut, CrawlTriggerRequest, CrawlTriggerResponse
from app.schemas.user import UserOut
from app.api.deps import require_role
from app.crawler.scheduler import crawler_queue

admin_router = APIRouter(prefix="/api/admin", tags=["Admin Operations"])

@admin_router.post("/crawl-runs", response_model=CrawlTriggerResponse)
async def trigger_crawl_run(
    req: CrawlTriggerRequest,
    admin_user: User = Depends(require_role(UserRole.ADMIN))
):
    """
    Trigger an asynchronous distributed crawl run across specified portals (Role-gated: Admin).
    """
    job_id = await crawler_queue.enqueue_crawl_job(
        portal=req.portal or "all",
        crawl_type=req.crawl_type or "NEWS"
    )
    return {
        "task_id": job_id,
        "message": f"Crawl job '{job_id}' queued successfully for portal '{req.portal}'",
        "status": "QUEUED",
        "timestamp": datetime.utcnow()
    }

@admin_router.get("/crawl-logs", response_model=List[CrawlLogOut])
async def get_crawl_logs(
    limit: int = Query(50, ge=1, le=200),
    status_filter: Optional[str] = Query(None, description="Filter by SUCCESS, FAILED, RUNNING"),
    db: AsyncSession = Depends(get_db),
    analyst_user: User = Depends(require_role(UserRole.ANALYST))
):
    """
    Returns crawl execution history and failure logs (Role-gated: Analyst / Admin).
    Surfaces crawl failures directly to the UI.
    """
    query = select(CrawlLog).order_by(desc(CrawlLog.started_at)).limit(limit)
    if status_filter:
        query = query.where(CrawlLog.status == status_filter.upper())

    result = await db.execute(query)
    logs = result.scalars().all()
    return logs

@admin_router.get("/users", response_model=List[UserOut])
async def list_users(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_role(UserRole.ADMIN))
):
    """
    List all system users and roles (Role-gated: Admin).
    """
    query = select(User).order_by(User.id)
    result = await db.execute(query)
    users = result.scalars().all()
    return users
