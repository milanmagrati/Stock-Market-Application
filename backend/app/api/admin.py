from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.database import get_db
from app.models.crawler import CrawlLog
from app.models.user import User, UserRole
from app.schemas.crawler import (
    CrawlLogOut, 
    CrawlTriggerRequest, 
    CrawlTriggerResponse,
    SchedulerStatusOut,
    SchedulerToggleRequest,
    SchedulerIntervalRequest
)
from app.schemas.user import UserOut, UserCreate, UserRoleUpdate
from app.core.security import hash_password
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
        "timestamp": datetime.now(timezone.utc)
    }

@admin_router.get("/crawl-logs", response_model=List[CrawlLogOut])
async def get_crawl_logs(
    limit: int = Query(100, ge=1, le=200),
    status_filter: Optional[str] = Query(None, description="Filter by SUCCESS, FAILED, RUNNING"),
    portal: Optional[str] = Query(None, description="Filter by portal name"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.VIEWER))
):
    """
    Returns crawl execution history and failure logs (Role-gated: Read-only Viewer / Analyst / Admin).
    Surfaces crawl failures directly to the UI with optional filtering by status and portal.
    """
    query = select(CrawlLog).order_by(desc(CrawlLog.started_at)).limit(limit)
    if status_filter and status_filter.upper() != "ALL":
        query = query.where(CrawlLog.status == status_filter.upper())
    if portal and portal.lower() != "all":
        query = query.where(CrawlLog.portal == portal)

    result = await db.execute(query)
    logs = result.scalars().all()
    return logs

@admin_router.get("/scheduler", response_model=SchedulerStatusOut)
async def get_scheduler_status(
    current_user: User = Depends(require_role(UserRole.VIEWER))
):
    """
    Returns automated unattended periodic scheduler status (Role-gated: Read-only Viewer / Analyst / Admin).
    """
    return crawler_queue.get_scheduler_status()

@admin_router.post("/scheduler/toggle", response_model=SchedulerStatusOut)
async def toggle_scheduler(
    req: SchedulerToggleRequest,
    admin_user: User = Depends(require_role(UserRole.ADMIN))
):
    """
    Toggle automated periodic background crawl scheduler (Role-gated: Admin).
    """
    return crawler_queue.toggle_scheduler(req.enabled)

@admin_router.post("/scheduler/interval", response_model=SchedulerStatusOut)
async def set_scheduler_interval(
    req: SchedulerIntervalRequest,
    admin_user: User = Depends(require_role(UserRole.ADMIN))
):
    """
    Update automated crawler schedule interval in minutes (Role-gated: Admin).
    """
    return crawler_queue.set_scheduler_interval(req.interval_minutes)

# User Management (Role-gated: Admin)
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

@admin_router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_role(UserRole.ADMIN))
):
    """
    Create a new system user with assigned RBAC role (Role-gated: Admin).
    """
    existing = await db.execute(select(User).where(User.email == user_in.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User email already registered")

    valid_roles = [r.value for r in UserRole]
    if user_in.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")

    new_user = User(
        email=user_in.email.lower(),
        full_name=user_in.full_name,
        hashed_password=hash_password(user_in.password),
        role=user_in.role,
        is_active=True
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

@admin_router.put("/users/{user_id}/role", response_model=UserOut)
async def update_user_role(
    user_id: int,
    role_in: UserRoleUpdate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_role(UserRole.ADMIN))
):
    """
    Update an existing user's role: Admin, Analyst, or Viewer (Role-gated: Admin).
    """
    valid_roles = [r.value for r in UserRole]
    if role_in.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")

    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.email == "admin@omway.com" and role_in.role != UserRole.ADMIN.value:
        raise HTTPException(status_code=400, detail="Cannot demote primary system administrator account 'admin@omway.com'")

    user.role = role_in.role
    await db.commit()
    await db.refresh(user)
    return user

@admin_router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_role(UserRole.ADMIN))
):
    """
    Delete a system user (Role-gated: Admin).
    """
    if admin_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own active administrative account")

    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.email == "admin@omway.com":
        raise HTTPException(status_code=400, detail="Cannot delete primary system administrator account 'admin@omway.com'")

    await db.delete(user)
    await db.commit()
    return {"success": True, "message": f"User account '{user.email}' removed successfully"}

from app.partitions import get_partition_telemetry

@admin_router.get("/partitions")
async def get_partitions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.VIEWER))
):
    """
    Inspect PostgreSQL native table partitioning status and active partition bounds.
    """
    conn = await db.connection()
    partitions = await get_partition_telemetry(conn)
    return {
        "engine": db.bind.dialect.name,
        "is_partitioned": len(partitions) > 0,
        "total_partitions": len(partitions),
        "partitions": partitions
    }

