from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.database import Base

class CrawlLog(Base):
    __tablename__ = "crawl_logs"

    id = Column(Integer, primary_key=True, index=True)
    portal = Column(String(100), nullable=False, index=True)
    crawl_type = Column(String(50), nullable=False)  # "NEWS", "OHLCV", "FLOORSHEET"
    status = Column(String(20), nullable=False, index=True)  # "SUCCESS", "FAILED", "RUNNING"
    items_crawled = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow, index=True)
    finished_at = Column(DateTime, nullable=True)


class VolumeAnomalyEvent(Base):
    __tablename__ = "volume_anomaly_events"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    current_volume = Column(Float, nullable=False)
    avg_volume_20d = Column(Float, nullable=False)
    std_volume_20d = Column(Float, nullable=False)
    z_score = Column(Float, nullable=False)
    is_alert_dispatched = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    company = relationship("Company", back_populates="anomalies")
