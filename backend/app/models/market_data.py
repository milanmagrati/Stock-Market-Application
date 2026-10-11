from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base

class OHLCV(Base):
    __tablename__ = "ohlcv_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, primary_key=True, nullable=False, index=True)
    open = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    low = Column(Float, nullable=False)
    close = Column(Float, nullable=False)
    volume = Column(Float, nullable=False)
    vwap = Column(Float, nullable=True)
    turnover = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    company = relationship("Company", back_populates="ohlcv")

    __table_args__ = (
        Index("idx_ohlcv_company_date", "company_id", "date", unique=True),
        {"postgresql_partition_by": "RANGE (date)"},
    )


class Floorsheet(Base):
    __tablename__ = "floorsheets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, primary_key=True, nullable=False, index=True)
    contract_no = Column(String(50), nullable=True)
    buyer_broker = Column(String(50), nullable=False, index=True)
    seller_broker = Column(String(50), nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    rate = Column(Float, nullable=False)
    amount = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    company = relationship("Company", back_populates="floorsheets")

    __table_args__ = (
        Index("idx_floorsheet_company_date", "company_id", "date"),
        Index("idx_floorsheet_buyer_seller", "buyer_broker", "seller_broker"),
        {"postgresql_partition_by": "RANGE (date)"},
    )

