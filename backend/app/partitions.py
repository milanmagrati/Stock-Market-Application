import logging
from datetime import date, timedelta
from typing import List, Dict, Any
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

logger = logging.getLogger("nepse.partitions")

PARTITIONED_TABLES = ["floorsheets", "ohlcv_data"]

async def setup_native_partitions(conn: AsyncConnection, start_year: int = 2024, end_year: int = 2028):
    """
    Provisions native PostgreSQL range partition tables for time-series market data
    (floorsheets and ohlcv_data) across designated year intervals plus default catch-all partitions.
    """
    if conn.dialect.name != "postgresql":
        logger.info(f"Database dialect is '{conn.dialect.name}'; skipping PostgreSQL native partitioning.")
        return

    logger.info("Initializing PostgreSQL native table partitions...")

    for table in PARTITIONED_TABLES:
        # 1. Create monthly range partitions
        for year in range(start_year, end_year + 1):
            for month in range(1, 13):
                start_date = f"{year:04d}-{month:02d}-01"
                if month == 12:
                    end_date = f"{year + 1:04d}-01-01"
                else:
                    end_date = f"{year:04d}-{month + 1:02d}-01"

                part_name = f"{table}_y{year}m{month:02d}"
                sql = text(f"""
                    CREATE TABLE IF NOT EXISTS {part_name} 
                    PARTITION OF {table} 
                    FOR VALUES FROM ('{start_date}') TO ('{end_date}');
                """)
                await conn.execute(sql)

        # 2. Create DEFAULT partition as guaranteed fallback for any out-of-range dates
        default_part_name = f"{table}_default"
        try:
            default_sql = text(f"""
                CREATE TABLE IF NOT EXISTS {default_part_name} 
                PARTITION OF {table} DEFAULT;
            """)
            await conn.execute(default_sql)
        except Exception as e:
            # In case default table already exists or conflicting bound
            logger.debug(f"Default partition for {table} notice: {e}")

    logger.info("Native table partitions successfully provisioned.")


async def get_partition_telemetry(conn: AsyncConnection) -> List[Dict[str, Any]]:
    """
    Queries PostgreSQL catalog to inspect active declarative partitions, parent relationships, and range bounds.
    """
    if conn.dialect.name != "postgresql":
        return []

    sql = text("""
        SELECT 
            parent.relname AS parent_table,
            child.relname AS partition_name,
            pg_get_expr(child.relpartbound, child.oid) AS partition_bound
        FROM pg_inherits
        JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
        JOIN pg_class child ON pg_inherits.inhrelid = child.oid
        WHERE parent.relname IN ('floorsheets', 'ohlcv_data')
        ORDER BY parent.relname, child.relname;
    """)
    result = await conn.execute(sql)
    rows = result.mappings().all()
    return [dict(r) for r in rows]
