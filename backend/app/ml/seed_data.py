import json
import random
from datetime import datetime, date, timedelta
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.config import settings
from app.models.company import Company
from app.models.market_data import OHLCV, Floorsheet
from app.models.news import NewsArticle, ArticleCompanyTag
from app.models.user import User, UserRole
from app.models.crawler import CrawlLog, VolumeAnomalyEvent
from app.core.security import hash_password

# Base stock prices for realistic NEPSE simulation
COMPANY_BASE_PRICES = {
    "NABIL": 620.0,
    "GBIME": 215.0,
    "NICA": 480.0,
    "SHIVM": 540.0,
    "HDL": 1450.0,
    "CIT": 2350.0,
    "CHCL": 465.0,
    "UPPER": 240.0,
    "NTC": 910.0,
    "SHINE": 340.0,
}

SAMPLE_BROKERS = [f"Broker {i}" for i in [4, 14, 17, 28, 34, 38, 45, 49, 57, 58, 62]]

PORTALS = ["merolagani.com", "sharesansar.com", "nepsealpha.com", "bizmandu.com"]

NEWS_TEMPLATES = [
    ("{name} reports {pct}% surge in quarterly net profit amid loan recovery", "{name} ({symbol}) published its quarterly financial report showing a remarkable {pct}% growth in net profit. Net interest income and operating efficiency improved significantly.", 0.95),
    ("Board of {name} proposes {pct}% cash and bonus dividend for shareholders", "The board of directors of {name} ({symbol}) has recommended a total dividend of {pct}% from the distributable profits of the preceding fiscal year, subject to regulatory approval.", 0.92),
    ("{name} expands footprint with new branches and digital banking infrastructure", "{name} ({symbol}) announced the expansion of its network across major industrial corridors to capture higher institutional deposits.", 0.78),
    ("Institutional accumulation seen in {symbol} amidst heavy floorsheet turnover", "Trading floor data indicated strong buying pressure in {name} ({symbol}) with top brokers absorbing large sell orders near the closing auction.", 0.88),
    ("Sectoral rotation favors commercial banks and {symbol} in recent market rally", "Investors showed renewed interest in {sector} equities today, pushing {symbol} ({name}) higher on double its 20-day average trading volume.", 0.85),
    ("Regulatory updates from NRB likely to impact capitalization of {symbol}", "The central bank issued updated guidelines on capital adequacy and provisioning, prompting mixed reactions for major players including {symbol}.", 0.72),
    ("Market recap: NEPSE index stays resilient; {symbol} records high floorsheet activity", "Overall turnover reached 4.5 Arba with {symbol} ({name}) contributing heavily to the total transaction count on the trading floor.", 0.80),
]

async def seed_database(db: AsyncSession):
    # 1. Seed Users if not present
    existing_users = await db.execute(select(func.count(User.id)))
    if existing_users.scalar() == 0:
        users = [
            User(
                email="admin@omway.com",
                hashed_password=hash_password("admin123"),
                full_name="Admin User",
                role=UserRole.ADMIN.value
            ),
            User(
                email="analyst@omway.com",
                hashed_password=hash_password("analyst123"),
                full_name="Market Analyst",
                role=UserRole.ANALYST.value
            ),
            User(
                email="viewer@omway.com",
                hashed_password=hash_password("viewer123"),
                full_name="Public Viewer",
                role=UserRole.VIEWER.value
            ),
        ]
        db.add_all(users)
        await db.flush()

async def seed_single_company_telemetry(db: AsyncSession, comp: Company):
    """
    Generates 30 trading days of OHLCV and sample floorsheets for a newly added company.
    Ensures zero manual babysitting when new companies are added via config or API.
    """
    today = date.today()
    trading_days = []
    curr = today - timedelta(days=45)
    while len(trading_days) < 30 and curr <= today:
        if curr.weekday() != 5:  # skip Saturday
            trading_days.append(curr)
        curr += timedelta(days=1)
    trading_days = trading_days[-30:]

    base_price = COMPANY_BASE_PRICES.get(comp.symbol, 420.0)
    current_price = base_price
    history_volumes = []
    ohlcv_records = []
    anomaly_records = []

    for idx, trade_date in enumerate(trading_days):
        daily_pct = random.uniform(-0.025, 0.028)
        is_forced_anomaly = (idx in (22, 27) and comp.symbol in ("NABIL", "SHIVM", "UPPER", "NICA"))
        
        open_price = round(current_price * (1 + random.uniform(-0.005, 0.005)), 1)
        close_price = round(open_price * (1 + daily_pct), 1)
        high_price = round(max(open_price, close_price) * (1 + random.uniform(0.002, 0.015)), 1)
        low_price = round(min(open_price, close_price) * (1 - random.uniform(0.002, 0.015)), 1)
        
        if is_forced_anomaly:
            volume = int(random.uniform(180000, 320000))
        else:
            volume = int(random.uniform(25000, 75000))

        history_volumes.append(volume)
        typical_price = (high_price + low_price + close_price) / 3.0
        turnover = volume * typical_price
        vwap = round(typical_price * (1 + random.uniform(-0.008, 0.008)), 2)

        ohlcv_records.append(
            OHLCV(
                company_id=comp.id,
                date=trade_date,
                open=open_price,
                high=high_price,
                low=low_price,
                close=close_price,
                volume=volume,
                vwap=vwap,
                turnover=turnover
            )
        )

        if idx >= 20:
            window = history_volumes[idx-20:idx]
            avg_v = sum(window) / len(window)
            variance = sum((x - avg_v) ** 2 for x in window) / len(window)
            std_v = variance ** 0.5
            if std_v > 0:
                z = (volume - avg_v) / std_v
                if z > settings.VOLUME_ANOMALY_ZSCORE_THRESHOLD:
                    anomaly_records.append(
                        VolumeAnomalyEvent(
                            company_id=comp.id,
                            date=trade_date,
                            current_volume=volume,
                            avg_volume_20d=round(avg_v, 2),
                            std_volume_20d=round(std_v, 2),
                            z_score=round(z, 2),
                            is_alert_dispatched=True
                        )
                    )

        current_price = close_price

    db.add_all(ohlcv_records)
    db.add_all(anomaly_records)
    await db.flush()

    # Generate sample floorsheets for recent dates
    sample_dates = [date.today() - timedelta(days=d) for d in [1, 2, 3, 5]]
    floorsheets = []
    contract_counter = random.randint(20000, 50000)

    for f_date in sample_dates:
        num_txs = random.randint(15, 25)
        for _ in range(num_txs):
            buyer = random.choice(SAMPLE_BROKERS)
            seller = random.choice([b for b in SAMPLE_BROKERS if b != buyer])
            qty = random.choice([100, 200, 500, 1000, 1500, 2500, 5000])
            rate = round(base_price * (1 + random.uniform(-0.02, 0.02)), 1)
            amount = round(qty * rate, 2)
            contract_counter += 1

            floorsheets.append(
                Floorsheet(
                    company_id=comp.id,
                    date=f_date,
                    contract_no=f"FL-{contract_counter}",
                    buyer_broker=buyer,
                    seller_broker=seller,
                    quantity=qty,
                    rate=rate,
                    amount=amount
                )
            )
    db.add_all(floorsheets)
    await db.flush()

async def sync_companies_from_config(db: AsyncSession) -> List[str]:
    """
    Reads config/companies.json and automatically provisions any newly added companies
    with 1 month of trading data without manual babysitting.
    """
    newly_added = []
    if not settings.COMPANIES_CONFIG_PATH.exists():
        return newly_added

    with open(settings.COMPANIES_CONFIG_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    for item in data.get("companies", []):
        sym = item["symbol"].upper()
        existing = await db.execute(select(Company).where(Company.symbol == sym))
        if not existing.scalar_one_or_none():
            c = Company(
                symbol=sym,
                name=item["name"],
                sector=item["sector"],
                aliases=",".join(item.get("aliases", [])),
                is_active=True
            )
            db.add(c)
            await db.flush()
            await seed_single_company_telemetry(db, c)
            newly_added.append(sym)

    if newly_added:
        await db.commit()
    return newly_added

async def seed_database(db: AsyncSession):
    # 1. Seed Users if not present
    existing_users = await db.execute(select(func.count(User.id)))
    if existing_users.scalar() == 0:
        users = [
            User(
                email="admin@omway.com",
                hashed_password=hash_password("admin123"),
                full_name="Admin User",
                role=UserRole.ADMIN.value
            ),
            User(
                email="analyst@omway.com",
                hashed_password=hash_password("analyst123"),
                full_name="Market Analyst",
                role=UserRole.ANALYST.value
            ),
            User(
                email="viewer@omway.com",
                hashed_password=hash_password("viewer123"),
                full_name="Public Viewer",
                role=UserRole.VIEWER.value
            ),
        ]
        db.add_all(users)
        await db.flush()

    # 2. Sync / Seed Companies from config/companies.json
    await sync_companies_from_config(db)

    # 3. Seed News Articles and Multi-Label Tags if empty
    existing_news = await db.execute(select(func.count(NewsArticle.id)))
    if existing_news.scalar() == 0:
        article_objs = []
        tags_to_add = []
        article_id_counter = 1

        for i in range(25):
            comp1 = random.choice(companies)
            # Sometimes multi-label (two companies mentioned together in an industry roundup)
            multi_company = (i % 3 == 0)
            comp2 = random.choice([c for c in companies if c.id != comp1.id]) if multi_company else None

            template = random.choice(NEWS_TEMPLATES)
            portal = random.choice(PORTALS)
            pub_date = datetime.utcnow() - timedelta(days=random.randint(1, 28), hours=random.randint(1, 23))

            headline = template[0].format(
                name=comp1.name,
                symbol=comp1.symbol,
                sector=comp1.sector,
                pct=random.randint(12, 38)
            )
            body = template[1].format(
                name=comp1.name,
                symbol=comp1.symbol,
                sector=comp1.sector,
                pct=random.randint(12, 38)
            )
            if comp2:
                body += f" Meanwhile, peer company {comp2.name} ({comp2.symbol}) also observed sustained trading volumes."

            url = f"https://{portal}/news/article-{10000 + i}"
            article = NewsArticle(
                url=url,
                headline=headline,
                body=body,
                excerpt=body[:160] + "...",
                published_at=pub_date,
                source_portal=portal
            )
            article_objs.append((article, comp1, comp2, template[2]))

        for art, c1, c2, conf in article_objs:
            db.add(art)
            await db.flush()

            # Primary tag
            db.add(ArticleCompanyTag(
                article_id=art.id,
                company_id=c1.id,
                confidence_score=conf,
                is_analyst_corrected=False
            ))
            # Secondary multi-label tag if applicable
            if c2:
                db.add(ArticleCompanyTag(
                    article_id=art.id,
                    company_id=c2.id,
                    confidence_score=round(random.uniform(0.65, 0.78), 2),
                    is_analyst_corrected=False
                ))

        await db.flush()

    # 6. Seed Sample Initial Crawl Logs
    existing_logs = await db.execute(select(func.count(CrawlLog.id)))
    if existing_logs.scalar() == 0:
        sample_logs = [
            CrawlLog(
                portal="merolagani.com",
                crawl_type="NEWS",
                status="SUCCESS",
                items_crawled=14,
                started_at=datetime.utcnow() - timedelta(hours=3),
                finished_at=datetime.utcnow() - timedelta(hours=3, seconds=-12)
            ),
            CrawlLog(
                portal="sharesansar.com",
                crawl_type="NEWS",
                status="SUCCESS",
                items_crawled=18,
                started_at=datetime.utcnow() - timedelta(hours=2),
                finished_at=datetime.utcnow() - timedelta(hours=2, seconds=-15)
            ),
            CrawlLog(
                portal="nepsealpha.com",
                crawl_type="OHLCV",
                status="SUCCESS",
                items_crawled=10,
                started_at=datetime.utcnow() - timedelta(hours=1),
                finished_at=datetime.utcnow() - timedelta(hours=1, seconds=-20)
            ),
            CrawlLog(
                portal="bizmandu.com",
                crawl_type="NEWS",
                status="SUCCESS",
                items_crawled=8,
                started_at=datetime.utcnow() - timedelta(minutes=45),
                finished_at=datetime.utcnow() - timedelta(minutes=45, seconds=-8)
            ),
        ]
        db.add_all(sample_logs)
        await db.flush()

    await db.commit()
