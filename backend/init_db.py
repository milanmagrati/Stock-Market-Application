import asyncio
import sys
from pathlib import Path

# Set Windows Selector event loop policy for psycopg async compatibility
if sys.platform == "win32":
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    except Exception:
        pass

# Add backend to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.database import engine, Base, AsyncSessionLocal
from app.ml.seed_data import seed_database
from app.partitions import setup_native_partitions, get_partition_telemetry
from app.models import Company, OHLCV, Floorsheet, NewsArticle, User
from sqlalchemy import select, func

async def init_and_verify():
    print(f"Connecting to database via dialect: {engine.dialect.name}...")
    print("1. Initializing database schema...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        print("2. Provisioning PostgreSQL native range table partitions...")
        await setup_native_partitions(conn)
    print("Base tables and native partitions created successfully.")

    print("3. Inspecting native partitions on Supabase...")
    async with engine.connect() as conn:
        partitions = await get_partition_telemetry(conn)
        print(f"   Total active native partitions: {len(partitions)}")
        for p in partitions[:8]:
            print(f"   -> Parent: {p['parent_table']} | Child: {p['partition_name']} | Bound: {p['partition_bound']}")
        if len(partitions) > 8:
            print(f"   -> ... and {len(partitions) - 8} more partitions.")

    print("4. Seeding database with 30-day baseline telemetry, users, and market records...")
    async with AsyncSessionLocal() as session:
        await seed_database(session)
    print("Database seeding completed.")

    print("5. Verifying database record counts on Supabase...")
    async with AsyncSessionLocal() as session:
        companies_count = (await session.execute(select(func.count(Company.id)))).scalar()
        ohlcv_count = (await session.execute(select(func.count(OHLCV.id)))).scalar()
        floorsheets_count = (await session.execute(select(func.count(Floorsheet.id)))).scalar()
        news_count = (await session.execute(select(func.count(NewsArticle.id)))).scalar()
        users_count = (await session.execute(select(func.count(User.id)))).scalar()

        print(f"   Companies: {companies_count}")
        print(f"   OHLCV records (Partitioned): {ohlcv_count}")
        print(f"   Floorsheets (Partitioned): {floorsheets_count}")
        print(f"   News articles: {news_count}")
        print(f"   Users (RBAC): {users_count}")

if __name__ == "__main__":
    asyncio.run(init_and_verify())

