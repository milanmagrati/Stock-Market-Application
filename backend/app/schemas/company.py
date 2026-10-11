from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class CompanyBase(BaseModel):
    symbol: str
    name: str
    sector: str
    aliases: Optional[str] = None
    is_active: bool = True

class CompanyCreate(CompanyBase):
    pass

class CompanyOut(CompanyBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
