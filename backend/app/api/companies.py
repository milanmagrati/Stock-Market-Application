from typing import List, Optional
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.company import Company
from app.models.market_data import OHLCV
from app.models.user import User, UserRole
from app.schemas.company import CompanyOut, CompanyCreate, CompanyUpdate
from app.schemas.market_data import OHLCVOut
from app.api.deps import require_role
from app.ml.seed_data import seed_single_company_telemetry, sync_companies_from_config

companies_router = APIRouter(prefix="/api/companies", tags=["Companies & Market Data"])

@companies_router.get("", response_model=List[CompanyOut])
async def get_companies(
    include_inactive: bool = Query(False, description="Include inactive companies (for Admin)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the watchlist of tracked NEPSE companies.
    """
    query = select(Company)
    if not include_inactive:
        query = query.where(Company.is_active == True)
    query = query.order_by(Company.symbol)
    result = await db.execute(query)
    companies = result.scalars().all()
    return companies

@companies_router.get("/{company_id}/prices", response_model=List[OHLCVOut])
async def get_company_prices(
    company_id: int,
    range: str = Query("30d", description="Time range, default 30d"),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns daily OHLCV and VWAP records for the specified company.
    """
    comp_query = select(Company).where(Company.id == company_id)
    comp_res = await db.execute(comp_query)
    company = comp_res.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    query = (
        select(OHLCV)
        .where(OHLCV.company_id == company_id)
        .order_by(OHLCV.date.asc())
    )
    result = await db.execute(query)
    records = result.scalars().all()
    return records

@companies_router.post("", response_model=CompanyOut, status_code=status.HTTP_201_CREATED)
async def create_company(
    company_in: CompanyCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_role(UserRole.ADMIN))
):
    """
    Add a new company to the watchlist (Role-gated: Admin).
    Automatically provisions 30-day baseline OHLCV & floorsheets without manual babysitting.
    """
    sym = company_in.symbol.upper()
    existing = await db.execute(select(Company).where(Company.symbol == sym))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Company symbol '{sym}' already exists")

    new_company = Company(
        symbol=sym,
        name=company_in.name,
        sector=company_in.sector,
        aliases=company_in.aliases,
        is_active=company_in.is_active
    )
    db.add(new_company)
    await db.flush()

    # Automatically provision 30-day baseline telemetry
    await seed_single_company_telemetry(db, new_company)
    await db.commit()
    await db.refresh(new_company)
    return new_company

@companies_router.put("/{company_id}", response_model=CompanyOut)
async def update_company(
    company_id: int,
    company_in: CompanyUpdate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_role(UserRole.ADMIN))
):
    """
    Update watchlist company metadata (Role-gated: Admin).
    """
    comp_query = select(Company).where(Company.id == company_id)
    comp_res = await db.execute(comp_query)
    company = comp_res.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    if company_in.name is not None:
        company.name = company_in.name
    if company_in.sector is not None:
        company.sector = company_in.sector
    if company_in.aliases is not None:
        company.aliases = company_in.aliases
    if company_in.is_active is not None:
        company.is_active = company_in.is_active

    await db.commit()
    await db.refresh(company)
    return company

@companies_router.patch("/{company_id}/toggle-active", response_model=CompanyOut)
async def toggle_company_active(
    company_id: int,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_role(UserRole.ADMIN))
):
    """
    Toggle watchlist company active/inactive status (Role-gated: Admin).
    """
    comp_query = select(Company).where(Company.id == company_id)
    comp_res = await db.execute(comp_query)
    company = comp_res.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    company.is_active = not company.is_active
    await db.commit()
    await db.refresh(company)
    return company

@companies_router.delete("/{company_id}")
async def delete_company(
    company_id: int,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_role(UserRole.ADMIN))
):
    """
    Remove a company from the watchlist (Role-gated: Admin).
    """
    comp_query = select(Company).where(Company.id == company_id)
    comp_res = await db.execute(comp_query)
    company = comp_res.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    sym = company.symbol
    await db.delete(company)
    await db.commit()
    return {"success": True, "message": f"Company '{sym}' removed from watchlist"}

@companies_router.post("/sync-config")
async def sync_watchlist_config(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_role(UserRole.ADMIN))
):
    """
    Sync watchlist directly with config/companies.json (Role-gated: Admin).
    Provisions any newly specified companies and generates their 30-day telemetry.
    """
    newly_added = await sync_companies_from_config(db)
    return {
        "success": True,
        "newly_added": newly_added,
        "count": len(newly_added),
        "message": f"Synced with companies.json. {len(newly_added)} new company(ies) provisioned."
    }

@companies_router.post("/{company_id}/refresh-telemetry")
async def refresh_company_telemetry(
    company_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Simulates real-time market pulse / tick update:
    Updates latest OHLCV bar with live tick movement, increments volume,
    recalculates VWAP, and pushes an event over WebSocket.
    """
    import random
    from datetime import datetime
    from app.api.websocket import ws_manager

    comp_query = select(Company).where(Company.id == company_id)
    comp_res = await db.execute(comp_query)
    company = comp_res.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    query = (
        select(OHLCV)
        .where(OHLCV.company_id == company_id)
        .order_by(OHLCV.date.desc())
    )
    result = await db.execute(query)
    latest_rec = result.scalars().first()
    if not latest_rec:
        raise HTTPException(status_code=404, detail="No price record to refresh")

    # Realistic micro tick fluctuation
    delta_factor = random.choice([-0.006, -0.003, 0.002, 0.004, 0.007])
    new_close = round(latest_rec.close * (1 + delta_factor), 1)
    if new_close > latest_rec.high:
        latest_rec.high = new_close
    if new_close < latest_rec.low:
        latest_rec.low = new_close
    latest_rec.close = new_close
    added_volume = random.randint(1500, 4200)
    latest_rec.volume += added_volume
    typical_price = (latest_rec.high + latest_rec.low + latest_rec.close) / 3.0
    latest_rec.turnover = round(latest_rec.volume * typical_price, 2)
    latest_rec.vwap = round(typical_price * (1 + random.uniform(-0.003, 0.003)), 2)

    await db.commit()
    await db.refresh(latest_rec)

    # Broadcast live market update over WebSocket
    await ws_manager.broadcast({
        "type": "TELEMETRY_REFRESHED",
        "company_id": company.id,
        "symbol": company.symbol,
        "close": latest_rec.close,
        "volume": latest_rec.volume,
        "vwap": latest_rec.vwap,
        "timestamp": datetime.utcnow().isoformat()
    })

    return {
        "success": True,
        "symbol": company.symbol,
        "new_close": latest_rec.close,
        "new_volume": latest_rec.volume,
        "new_vwap": latest_rec.vwap,
        "delta_pct": round(delta_factor * 100, 2)
    }

