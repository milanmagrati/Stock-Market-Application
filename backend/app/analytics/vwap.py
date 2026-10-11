from typing import List, Dict, Any, Tuple
from app.models.market_data import OHLCV

def calculate_vwap_signals(ohlcv_records: List[OHLCV]) -> Dict[str, Any]:
    """
    Computes VWAP comparison and signals from OHLCV records.
    """
    if not ohlcv_records:
        return {
            "latest_close": 0.0,
            "latest_vwap": 0.0,
            "vwap_delta_pct": 0.0,
            "signal": "NO_DATA"
        }
    
    # Sort chronologically
    sorted_records = sorted(ohlcv_records, key=lambda x: x.date)
    latest = sorted_records[-1]

    # If vwap is already stored in record, use it; otherwise compute typical price
    if latest.vwap and latest.vwap > 0:
        latest_vwap = latest.vwap
    else:
        latest_vwap = (latest.high + latest.low + latest.close) / 3.0

    latest_close = latest.close
    delta_pct = ((latest_close - latest_vwap) / latest_vwap) * 100.0 if latest_vwap > 0 else 0.0

    if delta_pct > 1.0:
        signal = "BULLISH_ACCUMULATION"
    elif delta_pct < -1.0:
        signal = "BEARISH_DISTRIBUTION"
    else:
        signal = "NEUTRAL"

    return {
        "latest_close": round(latest_close, 2),
        "latest_vwap": round(latest_vwap, 2),
        "vwap_delta_pct": round(delta_pct, 2),
        "signal": signal
    }
