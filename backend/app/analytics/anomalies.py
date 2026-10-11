from typing import List, Dict, Any
from datetime import date
from app.models.market_data import OHLCV
from app.config import settings

def detect_volume_anomalies(ohlcv_records: List[OHLCV]) -> List[Dict[str, Any]]:
    """
    Volume Anomaly Detection Method:
    - Window: 20-day rolling window
    - Formula: Z-Score = (Current_Volume - Mean_Volume_20d) / Std_Volume_20d
    - Threshold: Z-score > 2.0 (stated explicitly as per requirements)
    """
    if not ohlcv_records:
        return []

    sorted_records = sorted(ohlcv_records, key=lambda x: x.date)
    anomalies = []
    window_size = settings.ROLLING_WINDOW_DAYS
    threshold = settings.VOLUME_ANOMALY_ZSCORE_THRESHOLD

    volumes = [r.volume for r in sorted_records]

    for i in range(len(sorted_records)):
        curr_rec = sorted_records[i]
        curr_vol = curr_rec.volume

        if i < window_size:
            # Not enough historical baseline yet
            avg_20d = sum(volumes[:i+1]) / (i + 1)
            std_20d = 0.0
            z_score = 0.0
            is_anomaly = False
        else:
            window = volumes[i - window_size : i]
            avg_20d = sum(window) / len(window)
            variance = sum((x - avg_20d) ** 2 for x in window) / len(window)
            std_20d = variance ** 0.5
            
            if std_20d > 0:
                z_score = (curr_vol - avg_20d) / std_20d
            else:
                z_score = 0.0
            
            is_anomaly = bool(z_score >= threshold)

        anomalies.append({
            "date": curr_rec.date,
            "volume": curr_vol,
            "avg_20d": round(avg_20d, 2),
            "std_20d": round(std_20d, 2),
            "z_score": round(z_score, 2),
            "is_anomaly": is_anomaly
        })

    return anomalies
