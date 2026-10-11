from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class ArticleTagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    company_symbol: Optional[str] = None
    company_name: Optional[str] = None
    confidence_score: float
    is_analyst_corrected: bool
    corrected_by: Optional[str] = None
    corrected_at: Optional[datetime] = None

class NewsArticleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    url: str
    headline: str
    excerpt: Optional[str] = None
    body: Optional[str] = None
    published_at: datetime
    source_portal: str
    created_at: datetime
    tags: List[ArticleTagOut] = []

class RecategorizeRequest(BaseModel):
    company_id: int
    action: str  # "ADD", "REMOVE", "UPDATE_CONFIDENCE"
    confidence_score: Optional[float] = 1.0
    notes: Optional[str] = None

class RecategorizeResponse(BaseModel):
    success: bool
    message: str
    article_id: int
    company_id: int
    updated_tags: List[ArticleTagOut] = []

class CategorizationCorrectionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    article_id: int
    article_headline: Optional[str] = None
    company_id: int
    company_symbol: Optional[str] = None
    company_name: Optional[str] = None
    action: str
    previous_confidence: Optional[float] = None
    new_confidence: Optional[float] = None
    user_email: str
    notes: Optional[str] = None
    created_at: datetime
