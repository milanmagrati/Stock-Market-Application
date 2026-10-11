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
        viewer_token = create_access_token("viewer@omway.com", role="Viewer")

        # 1. Viewer trying to trigger crawl -> 403 Forbidden
        res_v = await ac.post(
            "/api/admin/crawl-runs",
            json={"portal": "merolagani.com", "crawl_type": "NEWS"},
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert res_v.status_code == 403

        # 2. Analyst trying to trigger crawl -> 403 Forbidden
        res_an = await ac.post(
            "/api/admin/crawl-runs",
            json={"portal": "merolagani.com", "crawl_type": "NEWS"},
            headers={"Authorization": f"Bearer {analyst_token}"}
        )
        assert res_an.status_code == 403

        # 3. Admin trigger crawl -> 200 OK
        res_adm = await ac.post(
            "/api/admin/crawl-runs",
            json={"portal": "merolagani.com", "crawl_type": "NEWS"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_adm.status_code == 200
        assert "task_id" in res_adm.json()

        # 4. Viewer read-only access: can view crawl logs (200 OK)
        res_logs = await ac.get(
            "/api/admin/crawl-logs",
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert res_logs.status_code == 200
        assert isinstance(res_logs.json(), list)

        # 5. Viewer read-only access: can view scheduler status (200 OK)
        res_sched = await ac.get(
            "/api/admin/scheduler",
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert res_sched.status_code == 200
        assert "is_active" in res_sched.json()

        # 6. Viewer mutation restriction: cannot toggle scheduler (403 Forbidden)
        res_toggle = await ac.post(
            "/api/admin/scheduler/toggle",
            json={"enabled": True},
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert res_toggle.status_code == 403

@pytest.mark.asyncio
async def test_rbac_report_export():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        viewer_token = create_access_token("viewer@omway.com", role="Viewer")
        analyst_token = create_access_token("analyst@omway.com", role="Analyst")

        # 1. Viewer attempt -> 403 Forbidden (strict server-side check)
        v_res = await ac.get(
            "/api/reports/export?company_id=1&format=csv",
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert v_res.status_code == 403

        # 2. Analyst attempt -> 200 OK (CSV download)
        a_csv = await ac.get(
            "/api/reports/export?company_id=1&format=csv",
            headers={"Authorization": f"Bearer {analyst_token}"}
        )
        assert a_csv.status_code == 200
        assert "text/csv" in a_csv.headers["content-type"]
        assert "Symbol,Company_Name,Sector" in a_csv.text

        # 3. Analyst attempt -> 200 OK (JSON download)
        a_json = await ac.get(
            "/api/reports/export?company_id=1&format=json",
            headers={"Authorization": f"Bearer {analyst_token}"}
        )
        assert a_json.status_code == 200
        assert "application/json" in a_json.headers["content-type"]
        data = a_json.json()
        assert "dossiers" in data
        assert len(data["dossiers"]) > 0

@pytest.mark.asyncio
async def test_rbac_user_management():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        admin_token = create_access_token("admin@omway.com", role="Admin")
        viewer_token = create_access_token("viewer@omway.com", role="Viewer")

        # 1. Non-admin create user -> 403 Forbidden
        v_res = await ac.post(
            "/api/admin/users",
            json={"email": "newtest@omway.com", "full_name": "Test User", "password": "pass", "role": "Viewer"},
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert v_res.status_code == 403

        # 2. Admin create user -> 201 Created
        new_email = "created_analyst@omway.com"
        adm_res = await ac.post(
            "/api/admin/users",
            json={"email": new_email, "full_name": "Created Analyst", "password": "password123", "role": "Analyst"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert adm_res.status_code == 201
        created_user = adm_res.json()
        user_id = created_user["id"]
        assert created_user["email"] == new_email

        # 3. Admin update role -> 200 OK
        role_res = await ac.put(
            f"/api/admin/users/{user_id}/role",
            json={"role": "Admin"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert role_res.status_code == 200
        assert role_res.json()["role"] == "Admin"

        # 4. Admin delete user -> 200 OK
        del_res = await ac.delete(
            f"/api/admin/users/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert del_res.status_code == 200
        assert del_res.json()["success"] is True

@pytest.mark.asyncio
async def test_rbac_watchlist_management():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        admin_token = create_access_token("admin@omway.com", role="Admin")
        viewer_token = create_access_token("viewer@omway.com", role="Viewer")

        # 1. Non-admin toggle company -> 403 Forbidden
        v_res = await ac.patch(
            "/api/companies/1/toggle-active",
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert v_res.status_code == 403

        # 2. Admin toggle company -> 200 OK
        t_res = await ac.patch(
            "/api/companies/1/toggle-active",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert t_res.status_code == 200

        # Toggle back to active
        await ac.patch(
            "/api/companies/1/toggle-active",
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 3. Admin sync config -> 200 OK
        sync_res = await ac.post(
            "/api/companies/sync-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert sync_res.status_code == 200
        assert "newly_added" in sync_res.json()

@pytest.mark.asyncio
async def test_news_corrections_log_and_scheduler():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        admin_token = create_access_token("admin@omway.com", role="Admin")
        analyst_token = create_access_token("analyst@omway.com", role="Analyst")

        # 1. Fetch corrections log -> 200 OK
        corr_res = await ac.get(
            "/api/news/corrections",
            headers={"Authorization": f"Bearer {analyst_token}"}
        )
        assert corr_res.status_code == 200
        assert isinstance(corr_res.json(), list)

        # 2. Export retraining corpus -> 200 OK
        exp_res = await ac.get(
            "/api/news/corrections/export?format=json",
            headers={"Authorization": f"Bearer {analyst_token}"}
        )
        assert exp_res.status_code == 200
        assert "dataset_name" in exp_res.json()

        # 3. Scheduler status -> 200 OK
        sch_res = await ac.get(
            "/api/admin/scheduler",
            headers={"Authorization": f"Bearer {analyst_token}"}
        )
        assert sch_res.status_code == 200
        assert "is_active" in sch_res.json()
