import asyncio
import sys
from pathlib import Path
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app
from app.core.security import create_access_token

async def run_all_tests():
    print("=" * 60)
    print("RUNNING AUTOMATED TEST SUITE: NEPSE STOCK APPLICATION")
    print("=" * 60)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health check
        res = await client.get("/api/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        print(" [PASS] GET /api/health -> 200 OK")

        # 2. Watchlist of companies
        res = await client.get("/api/companies")
        assert res.status_code == 200, f"Companies failed: {res.text}"
        companies = res.json()
        assert len(companies) >= 10, f"Expected 10 companies, got {len(companies)}"
        print(f" [PASS] GET /api/companies -> 200 OK ({len(companies)} companies returned)")

        # 3. 30-Day OHLCV data
        comp_id = companies[0]["id"]
        res = await client.get(f"/api/companies/{comp_id}/prices?range=30d")
        assert res.status_code == 200, f"Prices failed: {res.text}"
        prices = res.json()
        assert len(prices) == 30, f"Expected 30 prices, got {len(prices)}"
        print(f" [PASS] GET /api/companies/{comp_id}/prices?range=30d -> 200 OK (30 daily candles)")

        # 4. News with Multi-Label Tags
        res = await client.get("/api/news")
        assert res.status_code == 200, f"News failed: {res.text}"
        news = res.json()
        assert len(news) > 0, "No news returned"
        assert len(news[0]["tags"]) > 0, "No tags on first news"
        print(f" [PASS] GET /api/news -> 200 OK ({len(news)} articles with confidence-scored tags)")

        # 5. Behavior Summary (VWAP, Pressure, Anomalies, Floorsheets)
        res = await client.get(f"/api/companies/{comp_id}/behavior-summary")
        assert res.status_code == 200, f"Behavior summary failed: {res.text}"
        b_data = res.json()
        assert "vwap_delta_pct" in b_data
        assert "buy_sell_pressure_index" in b_data
        assert "volume_anomalies" in b_data
        assert "broker_breakdown" in b_data
        assert "written_findings" in b_data
        assert "predicted_next_day_direction" in b_data
        print(f" [PASS] GET /api/companies/{comp_id}/behavior-summary -> 200 OK (VWAP, Pressure: {b_data['buy_sell_pressure_index']}, Anomaly Count: {b_data['anomaly_count_30d']})")

        # 6. Cross-Company Comparison
        res = await client.get("/api/comparison")
        assert res.status_code == 200, f"Comparison failed: {res.text}"
        comp_data = res.json()
        assert len(comp_data["most_volatile"]) > 0
        assert len(comp_data["most_active"]) > 0
        assert len(comp_data["most_in_the_news"]) > 0
        print(f" [PASS] GET /api/comparison -> 200 OK (Cross-Company Matrix populated)")

        # 7. Authentication Login
        login_res = await client.post("/api/auth/login", json={"email": "admin@omway.com", "password": "admin123"})
        assert login_res.status_code == 200, f"Admin login failed: {login_res.text}"
        assert login_res.json()["user"]["role"] == "Admin"
        print(" [PASS] POST /api/auth/login -> 200 OK (Admin JWT issued)")

        # 8. RBAC Server-side enforcement on News Recategorize
        viewer_token = create_access_token("viewer@omway.com", role="Viewer")
        analyst_token = create_access_token("analyst@omway.com", role="Analyst")

        # Viewer attempt -> 403 Forbidden
        v_res = await client.post(
            f"/api/news/{news[0]['id']}/recategorize",
            json={"company_id": comp_id, "action": "UPDATE_CONFIDENCE", "confidence_score": 0.95},
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert v_res.status_code == 403, f"Expected 403 Forbidden for Viewer, got {v_res.status_code}"
        print(" [PASS] RBAC Check 1: Viewer blocked with 403 Forbidden on recategorize")

        # Analyst attempt -> 200 OK
        a_res = await client.post(
            f"/api/news/{news[0]['id']}/recategorize",
            json={"company_id": comp_id, "action": "UPDATE_CONFIDENCE", "confidence_score": 0.95, "notes": "Analyst verified"},
            headers={"Authorization": f"Bearer {analyst_token}"}
        )
        assert a_res.status_code == 200, f"Expected 200 for Analyst, got {a_res.status_code}"
        print(" [PASS] RBAC Check 2: Analyst successfully recategorized news article")

        # 9. RBAC Server-side enforcement on Admin Crawl Run
        # Analyst attempt to trigger crawl -> 403 Forbidden
        an_crawl = await client.post(
            "/api/admin/crawl-runs",
            json={"portal": "merolagani.com", "crawl_type": "NEWS"},
            headers={"Authorization": f"Bearer {analyst_token}"}
        )
        assert an_crawl.status_code == 403, f"Expected 403 for Analyst on crawl run, got {an_crawl.status_code}"
        print(" [PASS] RBAC Check 3: Analyst blocked with 403 Forbidden on trigger crawl")

        # Admin trigger crawl -> 200 OK
        admin_token = login_res.json()["access_token"]
        adm_crawl = await client.post(
            "/api/admin/crawl-runs",
            json={"portal": "merolagani.com", "crawl_type": "NEWS"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert adm_crawl.status_code == 200, f"Expected 200 for Admin on crawl run, got {adm_crawl.status_code}"
        print(f" [PASS] RBAC Check 4: Admin successfully triggered crawl job ({adm_crawl.json()['task_id']})")

    print("=" * 60)
    print("ALL 9 CRITICAL INTEGRATION TESTS PASSED PERFECTLY!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_all_tests())
