import httpx
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.crawler.rate_limiter import rate_limiter
from app.models.news import NewsArticle, ArticleCompanyTag
from app.models.company import Company
from app.models.crawler import CrawlLog
from app.ml.categorizer import NewsCategorizer

class BasePortalCrawler:
    portal_name: str = "base"
    base_url: str = ""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def fetch_html(self, url: str) -> Optional[str]:
        # Enforce rate limiter and robots.txt
        allowed = await rate_limiter.acquire(url, settings.DEFAULT_USER_AGENT)
        if not allowed:
            raise PermissionError(f"Robots.txt disallows crawling {url}")

        headers = {
            "User-Agent": settings.DEFAULT_USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }

        async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return response.text

    async def run(self) -> Dict[str, Any]:
        """
        Executes crawl, deduplicates by URL, categorizes articles, and records CrawlLog.
        """
        start_time = datetime.utcnow()
        crawl_log = CrawlLog(
            portal=self.portal_name,
            crawl_type="NEWS",
            status="RUNNING",
            items_crawled=0,
            started_at=start_time
        )
        self.db.add(crawl_log)
        await self.db.flush()

        try:
            articles = await self.scrape_articles()
            new_articles_count = 0

            # Fetch companies for categorization
            comp_res = await self.db.execute(select(Company))
            companies = comp_res.scalars().all()
            categorizer = NewsCategorizer(companies)

            for art_data in articles:
                url = art_data.get("url")
                if not url:
                    continue

                # Deduplicate by URL
                existing = await self.db.execute(select(NewsArticle).where(NewsArticle.url == url))
                if existing.scalar_one_or_none():
                    continue

                article = NewsArticle(
                    url=url,
                    headline=art_data.get("headline", ""),
                    body=art_data.get("body", ""),
                    excerpt=art_data.get("excerpt", "")[:300],
                    published_at=art_data.get("published_at", datetime.utcnow()),
                    source_portal=self.portal_name
                )
                self.db.add(article)
                await self.db.flush()

                # Multi-label categorization
                tags = categorizer.categorize_article(article.headline, article.body or "")
                for comp_id, conf in tags:
                    tag = ArticleCompanyTag(
                        article_id=article.id,
                        company_id=comp_id,
                        confidence_score=conf,
                        is_analyst_corrected=False
                    )
                    self.db.add(tag)

                new_articles_count += 1

            crawl_log.status = "SUCCESS"
            crawl_log.items_crawled = new_articles_count
            crawl_log.finished_at = datetime.utcnow()
            await self.db.commit()

            return {
                "portal": self.portal_name,
                "status": "SUCCESS",
                "items_crawled": new_articles_count,
                "error": None
            }

        except Exception as e:
            await self.db.rollback()
            crawl_log.status = "FAILED"
            crawl_log.error_message = str(e)
            crawl_log.finished_at = datetime.utcnow()
            self.db.add(crawl_log)
            await self.db.commit()

            return {
                "portal": self.portal_name,
                "status": "FAILED",
                "items_crawled": 0,
                "error": str(e)
            }

    async def scrape_articles(self) -> List[Dict[str, Any]]:
        raise NotImplementedError("Subclasses must implement scrape_articles")
