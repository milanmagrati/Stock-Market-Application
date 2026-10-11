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
