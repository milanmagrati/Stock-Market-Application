import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
import sys
from pathlib import Path

# Add backend to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app
from app.database import AsyncSessionLocal
from app.core.security import create_access_token

@pytest.mark.asyncio
async def test_health():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/health")
        assert res.status_code == 200
        assert res.json()["status"] == "HEALTHY"

@pytest.mark.asyncio
async def test_get_companies():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/companies")
        assert res.status_code == 200
        companies = res.json()
        assert len(companies) >= 10
        symbols = [c["symbol"] for c in companies]
        assert "NABIL" in symbols
        assert "SHIVM" in symbols

@pytest.mark.asyncio
async def test_get_prices():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/companies/1/prices?range=30d")
        assert res.status_code == 200
        prices = res.json()
        assert len(prices) == 30
        assert "open" in prices[0]
        assert "close" in prices[0]
        assert "vwap" in prices[0]

@pytest.mark.asyncio
async def test_get_news():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/news")
        assert res.status_code == 200
        articles = res.json()
        assert len(articles) > 0
        assert "headline" in articles[0]
        assert "tags" in articles[0]
        assert len(articles[0]["tags"]) > 0
        assert "confidence_score" in articles[0]["tags"][0]

@pytest.mark.asyncio
async def test_behavior_summary():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/companies/1/behavior-summary")
        assert res.status_code == 200
        data = res.json()
        assert "vwap_delta_pct" in data
        assert "buy_sell_pressure_index" in data
        assert "volume_anomalies" in data
        assert "broker_breakdown" in data
        assert "written_findings" in data
        assert "predicted_next_day_direction" in data

@pytest.mark.asyncio
async def test_cross_company_comparison():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/comparison")
        assert res.status_code == 200
        data = res.json()
        assert "all_companies" in data
        assert "most_volatile" in data
        assert "most_active" in data
        assert "most_in_the_news" in data

@pytest.mark.asyncio
async def test_auth_login():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Admin login
        res = await ac.post("/api/auth/login", json={"email": "admin@omway.com", "password": "admin123"})
        assert res.status_code == 200
        assert "access_token" in res.json()
        assert res.json()["user"]["role"] == "Admin"

        # Analyst login
        res_an = await ac.post("/api/auth/login", json={"email": "analyst@omway.com", "password": "analyst123"})
        assert res_an.status_code == 200
        assert res_an.json()["user"]["role"] == "Analyst"

        # Invalid password
        bad_res = await ac.post("/api/auth/login", json={"email": "admin@omway.com", "password": "wrongpassword"})
        assert bad_res.status_code == 401

@pytest.mark.asyncio
async def test_rbac_recategorize():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        analyst_token = create_access_token("analyst@omway.com", role="Analyst")
        viewer_token = create_access_token("viewer@omway.com", role="Viewer")

        # 1. Viewer attempt -> Should be 403 Forbidden
        viewer_res = await ac.post(
            "/api/news/1/recategorize",
            json={"company_id": 1, "action": "UPDATE_CONFIDENCE", "confidence_score": 0.95},
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert viewer_res.status_code == 403

        # 2. Analyst attempt -> Should be 200 OK
        analyst_res = await ac.post(
            "/api/news/1/recategorize",
            json={"company_id": 1, "action": "UPDATE_CONFIDENCE", "confidence_score": 0.95, "notes": "Verified by analyst"},
            headers={"Authorization": f"Bearer {analyst_token}"}
        )
        assert analyst_res.status_code == 200
        assert analyst_res.json()["success"] is True

@pytest.mark.asyncio
async def test_rbac_admin_crawl():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        admin_token = create_access_token("admin@omway.com", role="Admin")
        analyst_token = create_access_token("analyst@omway.com", role="Analyst")

        # Analyst trying to trigger crawl -> 403 Forbidden
        res_an = await ac.post(
            "/api/admin/crawl-runs",
            json={"portal": "merolagani.com", "crawl_type": "NEWS"},
            headers={"Authorization": f"Bearer {analyst_token}"}
        )
        assert res_an.status_code == 403

        # Admin trigger crawl -> 200 OK
        res_adm = await ac.post(
            "/api/admin/crawl-runs",
            json={"portal": "merolagani.com", "crawl_type": "NEWS"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_adm.status_code == 200
        assert "task_id" in res_adm.json()
