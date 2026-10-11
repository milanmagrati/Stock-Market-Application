import asyncio
import sys
from pathlib import Path

# Add backend to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.database import engine, Base, AsyncSessionLocal
from app.ml.seed_data import seed_database
from app.models import Company, OHLCV, Floorsheet, NewsArticle, User
from sqlalchemy import select, func

async def init_and_verify():
    print("Initializing database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created successfully.")

    print("Seeding database...")
    async with AsyncSessionLocal() as session:
        await seed_database(session)
    print("Database seeding completed.")

    print("Verifying counts...")
    async with AsyncSessionLocal() as session:
        companies_count = (await session.execute(select(func.count(Company.id)))).scalar()
        ohlcv_count = (await session.execute(select(func.count(OHLCV.id)))).scalar()
        floorsheets_count = (await session.execute(select(func.count(Floorsheet.id)))).scalar()
        news_count = (await session.execute(select(func.count(NewsArticle.id)))).scalar()
        users_count = (await session.execute(select(func.count(User.id)))).scalar()

        print(f"Companies seeded: {companies_count}")
        print(f"OHLCV records: {ohlcv_count}")
        print(f"Floorsheet records: {floorsheets_count}")
        print(f"News articles: {news_count}")
        print(f"Users: {users_count}")

if __name__ == "__main__":
    asyncio.run(init_and_verify())
