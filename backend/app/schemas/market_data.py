from datetime import date as dt_date, datetime as dt_datetime
from typing import Optional, List
from pydantic import BaseModel

class OHLCVOut(BaseModel):
    id: int
    company_id: int
    date: dt_date
    open: float
    high: float
    low: float
    close: float
    volume: float
    vwap: Optional[float] = None
    turnover: Optional[float] = None

    class Config:
        from_attributes = True

class FloorsheetOut(BaseModel):
    id: int
    company_id: int
    date: dt_date
    contract_no: Optional[str] = None
    buyer_broker: str
    seller_broker: str
    quantity: int
    rate: float
    amount: float

    class Config:
        from_attributes = True

class BrokerBreakdownItem(BaseModel):
    broker: str
    buy_quantity: int = 0
    sell_quantity: int = 0
    net_quantity: int = 0
    total_amount: float = 0.0

class BrokerSummaryOut(BaseModel):
    date: Optional[dt_date] = None
    top_buyers: List[BrokerBreakdownItem] = []
    top_sellers: List[BrokerBreakdownItem] = []
    total_transactions: int = 0
    total_volume: int = 0
    total_turnover: float = 0.0

