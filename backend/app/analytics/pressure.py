from typing import List, Dict, Any
from app.models.market_data import OHLCV

def calculate_pressure_indicator(ohlcv_records: List[OHLCV]) -> Dict[str, Any]:
    """
    Computes Buy/Sell Pressure Indicator (0-100 scale) based on price action and volume.
    Close Location Value (CLV) = ((Close - Low) - (High - Close)) / (High - Low)
    """
    if not ohlcv_records:
        return {
            "pressure_index": 50.0,
            "signal": "NEUTRAL"
        }

    sorted_records = sorted(ohlcv_records, key=lambda x: x.date)
    latest = sorted_records[-1]

    spread = latest.high - latest.low
    if spread <= 0:
        clv = 0.0
    else:
        clv = ((latest.close - latest.low) - (latest.high - latest.close)) / spread

    # Scale CLV from [-1, 1] to [0, 100]
    base_pressure = ((clv + 1.0) / 2.0) * 100.0

    # Volume momentum adjustment (if volume is above average, amplify pressure signal)
    if len(sorted_records) >= 5:
        recent_vols = [r.volume for r in sorted_records[-5:]]
        avg_vol = sum(recent_vols) / len(recent_vols)
        vol_ratio = latest.volume / avg_vol if avg_vol > 0 else 1.0
        
        # Moderate adjustment factor
        if vol_ratio > 1.2:
            if base_pressure > 50:
                base_pressure = min(100.0, base_pressure + 5.0)
            else:
                base_pressure = max(0.0, base_pressure - 5.0)

    pressure_index = round(base_pressure, 1)

    if pressure_index >= 70:
        signal = "STRONG_BUY_PRESSURE"
    elif pressure_index >= 55:
        signal = "MODERATE_BUY_PRESSURE"
    elif pressure_index <= 30:
        signal = "STRONG_SELL_PRESSURE"
    elif pressure_index <= 45:
        signal = "MODERATE_SELL_PRESSURE"
    else:
        signal = "BALANCED_PRESSURE"

    return {
        "pressure_index": pressure_index,
        "signal": signal
    }
