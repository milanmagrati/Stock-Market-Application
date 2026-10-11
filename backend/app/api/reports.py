import csv
import io
import json
from datetime import datetime, date, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.company import Company
from app.models.market_data import OHLCV, Floorsheet
from app.models.news import NewsArticle, ArticleCompanyTag
from app.models.user import User, UserRole
from app.api.deps import require_role
from app.analytics.vwap import calculate_vwap_signals
from app.analytics.pressure import calculate_pressure_indicator
from app.analytics.anomalies import detect_volume_anomalies
from app.analytics.floorsheet import summarize_floorsheets
from app.analytics.news_impact import correlate_news_with_movement, generate_written_findings_summary
from app.ml.direction_classifier import price_classifier

reports_router = APIRouter(prefix="/api/reports", tags=["Reporting & Institutional Exports"])

@reports_router.get("/export")
async def export_market_report(
    company_id: Optional[int] = Query(None, description="Company ID to export (optional, defaults to first active or all)"),
    format: str = Query("csv", description="Format of exported report: 'csv' or 'json'"),
    db: AsyncSession = Depends(get_db),
    analyst_user: User = Depends(require_role(UserRole.ANALYST))
):
    """
    Role-gated institutional report export endpoint (Role-gated: Analyst / Admin).
    Enforces server-side RBAC: Viewer role receives HTTP 403 Forbidden.
    Compiles complete 30-day OHLCV, VWAP, Buy/Sell pressure, 20-day rolling volume anomalies,
    floorsheet broker rankings, news event studies, and written findings.
    """
    # Fetch target companies
    if company_id:
        comp_res = await db.execute(select(Company).where(Company.id == company_id))
        target_company = comp_res.scalar_one_or_none()
        if not target_company:
            raise HTTPException(status_code=404, detail="Company not found")
        companies = [target_company]
    else:
        comp_res = await db.execute(select(Company).where(Company.is_active == True).order_by(Company.symbol))
        companies = comp_res.scalars().all()
        if not companies:
            raise HTTPException(status_code=404, detail="No active companies found")

    report_dossier = []

    for comp in companies:
        # 1. Fetch OHLCV
        ohlcv_res = await db.execute(
            select(OHLCV)
            .where(OHLCV.company_id == comp.id)
            .order_by(OHLCV.date.asc())
        )
        ohlcv_records = ohlcv_res.scalars().all()
        if not ohlcv_records:
            continue

        # 2. Analytics calculations
        vwap_info = calculate_vwap_signals(ohlcv_records)
        pressure_info = calculate_pressure_indicator(ohlcv_records)
        anomalies = detect_volume_anomalies(ohlcv_records)
        date_to_anomaly = {a["date"]: a for a in anomalies}

        # 3. Floorsheets
        floor_res = await db.execute(
            select(Floorsheet)
            .where(Floorsheet.company_id == comp.id)
            .order_by(Floorsheet.date.desc())
        )
        floorsheets = floor_res.scalars().all()
        broker_info = summarize_floorsheets(floorsheets)

        # 4. News correlation
        tag_query = (
            select(ArticleCompanyTag)
            .where(ArticleCompanyTag.company_id == comp.id)
            .options(selectinload(ArticleCompanyTag.article))
        )
        tag_res = await db.execute(tag_query)
        tags = tag_res.scalars().all()
        articles = [t.article for t in tags if t.article is not None]
        news_checks = correlate_news_with_movement(articles, ohlcv_records)

        # 5. Written findings summary
        written_summary = generate_written_findings_summary(
            symbol=comp.symbol,
            correlations=news_checks,
            vwap_info=vwap_info,
            anomalies=anomalies,
            broker_info=broker_info
        )

        # 6. ML Direction
        latest_rec = ohlcv_records[-1]
        ret_3d = 0.0
        ret_5d = 0.0
        if len(ohlcv_records) >= 6:
            ret_3d = (latest_rec.close - ohlcv_records[-4].close) / ohlcv_records[-4].close
            ret_5d = (latest_rec.close - ohlcv_records[-6].close) / ohlcv_records[-6].close

        recent_news_count = len([a for a in articles if (date.today() - a.published_at.date()).days <= 1])
        avg_20d_vol = sum(r.volume for r in ohlcv_records[-20:]) / min(20, len(ohlcv_records))
        vol_ratio = (latest_rec.volume / avg_20d_vol) if avg_20d_vol > 0 else 1.0

        ml_prediction = price_classifier.predict(
            return_3d=ret_3d,
            return_5d=ret_5d,
            vol_ratio_20d=vol_ratio,
            news_count_24h=recent_news_count,
            sentiment_score=0.6 if ret_3d > 0 else 0.4
        )

        report_dossier.append({
            "company": {
                "id": comp.id,
                "symbol": comp.symbol,
                "name": comp.name,
                "sector": comp.sector,
            },
            "vwap_summary": vwap_info,
            "pressure_summary": pressure_info,
            "broker_summary": broker_info,
            "written_findings": written_summary,
            "ml_prediction": ml_prediction,
            "daily_records": [
                {
                    "date": str(rec.date),
                    "open": rec.open,
                    "high": rec.high,
                    "low": rec.low,
                    "close": rec.close,
                    "volume": rec.volume,
                    "vwap": rec.vwap,
                    "turnover": rec.turnover,
                    "z_score": date_to_anomaly.get(rec.date, {}).get("z_score", 0.0),
                    "is_anomaly": date_to_anomaly.get(rec.date, {}).get("is_anomaly", False)
                }
                for rec in ohlcv_records
            ]
        })

    # Return CSV format
    if format.lower() == "csv":
        output = io.StringIO()
        fieldnames = [
            "Symbol", "Company_Name", "Sector", "Date", "Open", "High", "Low", "Close",
            "Volume", "VWAP", "Turnover", "Volume_ZScore", "Is_Volume_Anomaly",
            "Top_Buyer_Broker", "Top_Seller_Broker", "Latest_Buy_Sell_Pressure", "ML_Next_Day_Prediction"
        ]
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()

        for item in report_dossier:
            comp_meta = item["company"]
            top_buyer = item["broker_summary"].get("top_buyers", [{}])[0].get("broker", "N/A") if item["broker_summary"].get("top_buyers") else "N/A"
            top_seller = item["broker_summary"].get("top_sellers", [{}])[0].get("broker", "N/A") if item["broker_summary"].get("top_sellers") else "N/A"
            pressure = item["pressure_summary"].get("pressure_index", 50.0)
            ml_pred = item["ml_prediction"].get("prediction", "N/A")

            for day in item["daily_records"]:
                writer.writerow({
                    "Symbol": comp_meta["symbol"],
                    "Company_Name": comp_meta["name"],
                    "Sector": comp_meta["sector"],
                    "Date": day["date"],
                    "Open": day["open"],
                    "High": day["high"],
                    "Low": day["low"],
                    "Close": day["close"],
                    "Volume": day["volume"],
                    "VWAP": day["vwap"] or "",
                    "Turnover": day["turnover"] or "",
                    "Volume_ZScore": day["z_score"],
                    "Is_Volume_Anomaly": "YES" if day["is_anomaly"] else "NO",
                    "Top_Buyer_Broker": top_buyer,
                    "Top_Seller_Broker": top_seller,
                    "Latest_Buy_Sell_Pressure": pressure,
                    "ML_Next_Day_Prediction": ml_pred
                })

        filename = f"nepse_institutional_report_{companies[0].symbol if len(companies)==1 else 'all'}_{date.today().isoformat()}.csv"
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    # Return JSON format
    else:
        json_output = json.dumps({
            "report_title": "NEPSE Quantitative Behavior & Institutional Analytics Report",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "exported_by": analyst_user.email,
            "role": analyst_user.role,
            "tracked_companies_count": len(report_dossier),
            "dossiers": report_dossier
        }, indent=2, default=str)

        filename = f"nepse_institutional_report_{companies[0].symbol if len(companies)==1 else 'all'}_{date.today().isoformat()}.json"
        return Response(
            content=json_output,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
