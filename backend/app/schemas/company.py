from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class CompanyBase(BaseModel):
    symbol: str
    name: str
    sector: str
    aliases: Optional[str] = None
    is_active: bool = True

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    sector: Optional[str] = None
    aliases: Optional[str] = None
    is_active: Optional[bool] = None

class CompanyOut(CompanyBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
