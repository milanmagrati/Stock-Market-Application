from typing import List, Optional
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.company import Company
from app.models.market_data import OHLCV
from app.models.user import User, UserRole
from app.schemas.company import CompanyOut, CompanyCreate
from app.schemas.market_data import OHLCVOut
from app.api.deps import require_role

companies_router = APIRouter(prefix="/api/companies", tags=["Companies & Market Data"])

@companies_router.get("", response_model=List[CompanyOut])
async def get_companies(
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the watchlist of tracked NEPSE companies.
    """
    query = select(Company).where(Company.is_active == True).order_by(Company.symbol)
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
    """
    existing = await db.execute(select(Company).where(Company.symbol == company_in.symbol.upper()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Company symbol already exists")

    new_company = Company(
        symbol=company_in.symbol.upper(),
        name=company_in.name,
        sector=company_in.sector,
        aliases=company_in.aliases,
        is_active=company_in.is_active
    )
    db.add(new_company)
    await db.commit()
    await db.refresh(new_company)
    return new_company

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

