from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.news import NewsArticle, ArticleCompanyTag, CategorizationCorrection
from app.models.company import Company
from app.models.user import User, UserRole
from app.schemas.news import NewsArticleOut, RecategorizeRequest, RecategorizeResponse, ArticleTagOut
from app.api.deps import require_role, get_current_user
from app.api.websocket import ws_manager

news_router = APIRouter(prefix="/api/news", tags=["News & Categorization"])

@news_router.get("", response_model=List[NewsArticleOut])
async def get_news(
    company_id: Optional[int] = Query(None, description="Filter articles tagged with company ID"),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns categorized news articles with multi-label company tags and confidence scores.
    """
    if company_id:
        # Get article IDs tagged with this company
        tag_query = select(ArticleCompanyTag.article_id).where(ArticleCompanyTag.company_id == company_id)
        tag_res = await db.execute(tag_query)
        article_ids = tag_res.scalars().all()
        
        if not article_ids:
            return []

        query = (
            select(NewsArticle)
            .where(NewsArticle.id.in_(article_ids))
            .options(selectinload(NewsArticle.company_tags).selectinload(ArticleCompanyTag.company))
            .order_by(NewsArticle.published_at.desc())
            .limit(limit)
        )
    else:
        query = (
            select(NewsArticle)
            .options(selectinload(NewsArticle.company_tags).selectinload(ArticleCompanyTag.company))
            .order_by(NewsArticle.published_at.desc())
            .limit(limit)
        )

    result = await db.execute(query)
    articles = result.scalars().all()

    # Format tags with symbol and name
    output = []
    for art in articles:
        formatted_tags = []
        for tag in art.company_tags:
            formatted_tags.append(ArticleTagOut(
                id=tag.id,
                company_id=tag.company_id,
                company_symbol=tag.company.symbol if tag.company else None,
                company_name=tag.company.name if tag.company else None,
                confidence_score=tag.confidence_score,
                is_analyst_corrected=tag.is_analyst_corrected,
                corrected_by=tag.corrected_by,
                corrected_at=tag.corrected_at
            ))
        
        art_out = NewsArticleOut(
            id=art.id,
            url=art.url,
            headline=art.headline,
            excerpt=art.excerpt,
            body=art.body,
            published_at=art.published_at,
            source_portal=art.source_portal,
            created_at=art.created_at,
            tags=formatted_tags
        )
        output.append(art_out)

    return output

@news_router.post("/{article_id}/recategorize", response_model=RecategorizeResponse)
async def recategorize_article(
    article_id: int,
    req: RecategorizeRequest,
    db: AsyncSession = Depends(get_db),
    analyst_user: User = Depends(require_role(UserRole.ANALYST))
):
    """
    Analyst role correction endpoint (role-gated: Analyst / Admin).
    Logs corrections for model fine-tuning and future retraining.
    """
    # Verify article exists
    art_res = await db.execute(select(NewsArticle).where(NewsArticle.id == article_id))
    article = art_res.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    # Verify company exists
    comp_res = await db.execute(select(Company).where(Company.id == req.company_id))
    company = comp_res.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Target company not found")

    # Fetch existing tag
    tag_res = await db.execute(
        select(ArticleCompanyTag).where(
            ArticleCompanyTag.article_id == article_id,
            ArticleCompanyTag.company_id == req.company_id
        )
    )
    existing_tag = tag_res.scalar_one_or_none()
    prev_conf = existing_tag.confidence_score if existing_tag else None

    action = req.action.upper()
    if action == "REMOVE":
        if existing_tag:
            await db.delete(existing_tag)
            msg = f"Removed tag for {company.symbol}"
        else:
            msg = "Tag did not exist"
    elif action in ("ADD", "UPDATE_CONFIDENCE"):
        conf = req.confidence_score if req.confidence_score is not None else 1.0
        if existing_tag:
            existing_tag.confidence_score = conf
            existing_tag.is_analyst_corrected = True
            existing_tag.corrected_by = analyst_user.email
            existing_tag.corrected_at = datetime.utcnow()
            msg = f"Updated tag confidence for {company.symbol} to {conf}"
        else:
            new_tag = ArticleCompanyTag(
                article_id=article_id,
                company_id=req.company_id,
                confidence_score=conf,
                is_analyst_corrected=True,
                corrected_by=analyst_user.email,
                corrected_at=datetime.utcnow()
            )
            db.add(new_tag)
            msg = f"Added tag for {company.symbol} with confidence {conf}"
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use ADD, REMOVE, or UPDATE_CONFIDENCE.")

    # Audit log entry for model retraining
    correction_log = CategorizationCorrection(
        article_id=article_id,
        company_id=req.company_id,
        action=action,
        previous_confidence=prev_conf,
        new_confidence=req.confidence_score,
        user_email=analyst_user.email,
        notes=req.notes
    )
    db.add(correction_log)
    await db.commit()

    # Re-fetch updated tags
    updated_tags_res = await db.execute(
        select(ArticleCompanyTag)
        .where(ArticleCompanyTag.article_id == article_id)
        .options(selectinload(ArticleCompanyTag.company))
    )
    updated_tags = updated_tags_res.scalars().all()

    tags_out = [
        ArticleTagOut(
            id=t.id,
            company_id=t.company_id,
            company_symbol=t.company.symbol if t.company else None,
            company_name=t.company.name if t.company else None,
            confidence_score=t.confidence_score,
            is_analyst_corrected=t.is_analyst_corrected,
            corrected_by=t.corrected_by,
            corrected_at=t.corrected_at
        )
        for t in updated_tags
    ]

    # Push update to WebSocket
    await ws_manager.broadcast({
        "type": "ARTICLE_RECATEGORIZED",
        "article_id": article_id,
        "company_id": req.company_id,
        "action": action,
        "corrected_by": analyst_user.email,
        "timestamp": datetime.utcnow().isoformat()
    })

    return {
        "success": True,
        "message": msg,
        "article_id": article_id,
        "company_id": req.company_id,
        "updated_tags": tags_out
    }
