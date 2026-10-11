from datetime import date as dt_date, datetime as dt_datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from app.schemas.market_data import BrokerSummaryOut

class AnomalyPoint(BaseModel):
    date: dt_date
    volume: float
    avg_20d: float
    std_20d: float
    z_score: float
    is_anomaly: bool

class PriceMovementCheck(BaseModel):
    news_date: dt_date
    headline: str
    source_portal: str
    next_day_date: Optional[dt_date] = None
    next_day_price_change_pct: Optional[float] = None
    next_day_volume_change_pct: Optional[float] = None
    direction: Optional[str] = None  # "UP", "DOWN", "FLAT"

class BehaviorSummaryOut(BaseModel):
    company_id: int
    symbol: str
    company_name: str
    latest_date: dt_date
    latest_close: float
    latest_vwap: float
    vwap_delta_pct: float  # (close - vwap) / vwap * 100
    vwap_signal: str  # "BULLISH_ACCUMULATION" / "BEARISH_DISTRIBUTION" / "NEUTRAL"
    buy_sell_pressure_index: float  # 0 to 100 scale
    pressure_signal: str  # "STRONG_BUY_PRESSURE", "MODERATE_BUY", "NEUTRAL", "STRONG_SELL_PRESSURE"
    volume_anomalies: List[AnomalyPoint] = []
    anomaly_count_30d: int = 0
    broker_breakdown: Optional[BrokerSummaryOut] = None
    news_movement_checks: List[PriceMovementCheck] = []
    written_findings: str  # Quantitative narrative synthesis
    predicted_next_day_direction: Optional[Dict[str, Any]] = None  # Bonus ML prediction
