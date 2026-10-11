from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base

class NewsArticle(Base):
    __tablename__ = "news_articles"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String(500), unique=True, index=True, nullable=False)
    headline = Column(String(500), nullable=False)
    body = Column(Text, nullable=True)
    excerpt = Column(Text, nullable=True)
    published_at = Column(DateTime, nullable=False, index=True)
    source_portal = Column(String(100), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    company_tags = relationship("ArticleCompanyTag", back_populates="article", cascade="all, delete-orphan")
    corrections = relationship("CategorizationCorrection", back_populates="article", cascade="all, delete-orphan")


class ArticleCompanyTag(Base):
    __tablename__ = "article_company_tags"

    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("news_articles.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    confidence_score = Column(Float, nullable=False)  # 0.0 to 1.0
    is_analyst_corrected = Column(Boolean, default=False)
    corrected_by = Column(String(100), nullable=True)
    corrected_at = Column(DateTime, nullable=True)

    # Relationships
    article = relationship("NewsArticle", back_populates="company_tags")
    company = relationship("Company", back_populates="tags")

    __table_args__ = (
        Index("idx_article_company", "article_id", "company_id", unique=True),
    )


class CategorizationCorrection(Base):
    """
    Log corrections made by Analyst or Admin role for auditing and future ML retraining
    """
    __tablename__ = "categorization_corrections"

    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("news_articles.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(50), nullable=False)  # "ADD", "REMOVE", "UPDATE_CONFIDENCE"
    previous_confidence = Column(Float, nullable=True)
    new_confidence = Column(Float, nullable=True)
    user_email = Column(String(100), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    article = relationship("NewsArticle", back_populates="corrections")
