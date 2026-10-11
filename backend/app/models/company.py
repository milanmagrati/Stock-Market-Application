from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.database import Base

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    sector = Column(String(100), nullable=False)
    aliases = Column(String(500), nullable=True)  # JSON or comma-separated list
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    ohlcv = relationship("OHLCV", back_populates="company", cascade="all, delete-orphan")
    floorsheets = relationship("Floorsheet", back_populates="company", cascade="all, delete-orphan")
    tags = relationship("ArticleCompanyTag", back_populates="company", cascade="all, delete-orphan")
    anomalies = relationship("VolumeAnomalyEvent", back_populates="company", cascade="all, delete-orphan")
