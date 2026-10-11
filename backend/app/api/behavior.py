from typing import List, Dict, Any
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.company import Company
from app.models.market_data import OHLCV, Floorsheet
from app.models.news import NewsArticle, ArticleCompanyTag
from app.schemas.behavior import BehaviorSummaryOut
from app.schemas.market_data import BrokerSummaryOut
from app.analytics.vwap import calculate_vwap_signals
from app.analytics.pressure import calculate_pressure_indicator
from app.analytics.anomalies import detect_volume_anomalies
from app.analytics.floorsheet import summarize_floorsheets
from app.analytics.news_impact import correlate_news_with_movement, generate_written_findings_summary
from app.ml.direction_classifier import price_classifier

behavior_router = APIRouter(tags=["Market Behavior & Analytics"])

@behavior_router.get("/api/companies/{company_id}/behavior-summary", response_model=BehaviorSummaryOut)
@behavior_router.get("/api/companies/{company_id}/behavior_summary", response_model=BehaviorSummaryOut, include_in_schema=False)
async def get_company_behavior_summary(
    company_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns quantitative behavior analysis:
    - VWAP vs. Closing Price
    - Buy/Sell Pressure Indicator (0-100)
    - 20-day rolling Volume Anomaly Detection (Z-score > 2.0)
    - Broker-level Floorsheet Breakdown (Top 5 Buyers vs Sellers)
    - News vs. Next-day Price & Volume Correlation Check
    - Section 3 Written Findings Summary
    - Bonus ML Next-Day Direction Prediction
    """
    # 1. Fetch company
    comp_res = await db.execute(select(Company).where(Company.id == company_id))
    company = comp_res.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # 2. Fetch 30-day OHLCV
    ohlcv_res = await db.execute(
        select(OHLCV)
        .where(OHLCV.company_id == company_id)
        .order_by(OHLCV.date.asc())
    )
    ohlcv_records = ohlcv_res.scalars().all()
    if not ohlcv_records:
        raise HTTPException(status_code=404, detail="No trading data available for company")

    # 3. Calculate VWAP
    vwap_info = calculate_vwap_signals(ohlcv_records)

    # 4. Calculate Pressure Indicator
    pressure_info = calculate_pressure_indicator(ohlcv_records)

    # 5. Detect Volume Anomalies
    all_anomalies = detect_volume_anomalies(ohlcv_records)
    flagged_anomalies = [a for a in all_anomalies if a["is_anomaly"]]

    # 6. Fetch Floorsheet transactions
    floor_res = await db.execute(
        select(Floorsheet)
        .where(Floorsheet.company_id == company_id)
        .order_by(Floorsheet.date.desc())
    )
    floorsheet_records = floor_res.scalars().all()
    broker_info = summarize_floorsheets(floorsheet_records)

    # 7. Fetch news tagged with this company
    tag_query = (
        select(ArticleCompanyTag)
        .where(ArticleCompanyTag.company_id == company_id)
        .options(selectinload(ArticleCompanyTag.article))
    )
    tag_res = await db.execute(tag_query)
    tags = tag_res.scalars().all()
    articles = [t.article for t in tags if t.article is not None]

    # 8. Check correlation of news with next-day movement
    news_checks = correlate_news_with_movement(articles, ohlcv_records)

    # 9. Synthesize Section 3 Written Findings
    written_summary = generate_written_findings_summary(
        symbol=company.symbol,
        correlations=news_checks,
        vwap_info=vwap_info,
        anomalies=all_anomalies,
        broker_info=broker_info
    )

    # 10. Bonus ML Prediction
    latest_rec = ohlcv_records[-1]
    ret_3d = 0.0
    ret_5d = 0.0
    if len(ohlcv_records) >= 6:
        ret_3d = (latest_rec.close - ohlcv_records[-4].close) / ohlcv_records[-4].close
        ret_5d = (latest_rec.close - ohlcv_records[-6].close) / ohlcv_records[-6].close
    
    vol_ratio = 1.0
    if len(ohlcv_records) >= 20:
        avg_20 = sum(r.volume for r in ohlcv_records[-20:]) / 20.0
        vol_ratio = latest_rec.volume / avg_20 if avg_20 > 0 else 1.0

    prediction = price_classifier.predict(
        return_3d=ret_3d,
        return_5d=ret_5d,
        vol_ratio_20d=vol_ratio,
        news_count_24h=len([n for n in news_checks if n["news_date"] >= latest_rec.date - timedelta(days=2)]),
        sentiment_score=0.6 if pressure_info["pressure_index"] > 55 else -0.4 if pressure_info["pressure_index"] < 45 else 0.1
    )

    return BehaviorSummaryOut(
        company_id=company.id,
        symbol=company.symbol,
        company_name=company.name,
        latest_date=latest_rec.date,
        latest_close=vwap_info["latest_close"],
        latest_vwap=vwap_info["latest_vwap"],
        vwap_delta_pct=vwap_info["vwap_delta_pct"],
        vwap_signal=vwap_info["signal"],
        buy_sell_pressure_index=pressure_info["pressure_index"],
        pressure_signal=pressure_info["signal"],
        volume_anomalies=flagged_anomalies,
        anomaly_count_30d=len(flagged_anomalies),
        broker_breakdown=broker_info,
        news_movement_checks=news_checks,
        written_findings=written_summary,
        predicted_next_day_direction=prediction
    )

@behavior_router.get("/api/comparison")
async def get_cross_company_comparison(db: AsyncSession = Depends(get_db)):
    """
    Returns Cross-Company Comparison Matrix:
    - Most Volatile (30-day standard deviation of daily return %)
    - Most Active (Highest aggregate turnover & volume anomalies)
    - Most In-The-News (Article count)
    """
    comp_res = await db.execute(select(Company).where(Company.is_active == True))
    companies = comp_res.scalars().all()

    comparison_items = []

    for comp in companies:
        ohlcv_res = await db.execute(
            select(OHLCV)
            .where(OHLCV.company_id == comp.id)
            .order_by(OHLCV.date.asc())
        )
        records = ohlcv_res.scalars().all()
        if not records or len(records) < 2:
            continue

        # Daily returns
        returns = []
        for i in range(1, len(records)):
            prev = records[i-1].close
            curr = records[i].close
            if prev > 0:
                returns.append((curr - prev) / prev)

        # Volatility: std dev of returns * 100
        mean_ret = sum(returns) / len(returns) if returns else 0.0
        var_ret = sum((r - mean_ret) ** 2 for r in returns) / len(returns) if returns else 0.0
        volatility_pct = round((var_ret ** 0.5) * 100.0, 2)

        # Total 30-day turnover and volume
        total_turnover = sum(r.turnover or (r.volume * r.close) for r in records)
        total_volume = sum(r.volume for r in records)

        # Anomalies
        anomalies = detect_volume_anomalies(records)
        anomaly_count = sum(1 for a in anomalies if a["is_anomaly"])

        # Count news tagged
        news_count_res = await db.execute(
            select(func.count(ArticleCompanyTag.id))
            .where(ArticleCompanyTag.company_id == comp.id)
        )
        news_count = news_count_res.scalar() or 0

        latest = records[-1]
        first = records[0]
        month_change_pct = round(((latest.close - first.close) / first.close) * 100.0, 2)

        comparison_items.append({
            "company_id": comp.id,
            "symbol": comp.symbol,
            "name": comp.name,
            "sector": comp.sector,
            "latest_close": latest.close,
            "month_change_pct": month_change_pct,
            "volatility_pct": volatility_pct,
            "total_turnover": round(total_turnover, 2),
            "total_volume": int(total_volume),
            "anomaly_count": anomaly_count,
            "news_count": news_count
        })

    # Sortings for top categories
    most_volatile = sorted(comparison_items, key=lambda x: x["volatility_pct"], reverse=True)
    most_active = sorted(comparison_items, key=lambda x: x["total_turnover"], reverse=True)
    most_in_news = sorted(comparison_items, key=lambda x: x["news_count"], reverse=True)

    return {
        "all_companies": comparison_items,
        "most_volatile": most_volatile[:3],
        "most_active": most_active[:3],
        "most_in_the_news": most_in_news[:3]
    }
