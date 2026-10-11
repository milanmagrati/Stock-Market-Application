# Omway Technologies — NEPSE Stock Market Intelligence Platform

A full-stack, production-grade stock market application designed for the Nepal Stock Exchange (NEPSE). The platform crawls news from multiple portals and one month of NEPSE trading data (OHLCV + floorsheets) for 10 tracked companies, automatically categorizes news using multi-label AI/NLP tagging with confidence scoring, performs quantitative buyer/seller behavioral analysis, and serves real-time updates via WebSockets through a role-gated reactive dashboard.

---

## 1. Quick Start & Setup

### Option A: Local Run (Zero-Config Windows / Mac / Linux)

Prerequisites: Python 3.10+ and Node.js 18+.

1. **Activate Virtual Environment & Install Dependencies:**
   ```powershell
   # In project root:
   .\venv\Scripts\activate
   pip install -r backend/requirements.txt
   ```

2. **Initialize Database & Seed 30-Day NEPSE Telemetry:**
   ```powershell
   $env:PYTHONPATH="backend"
   python backend/init_db.py
   ```

3. **Start FastAPI Backend (Serves API + Built React Frontend at http://localhost:8000):**
   ```powershell
   $env:PYTHONPATH="backend"
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```

4. **(Optional) Run React Frontend in Vite Dev Server:**
   ```powershell
   cd frontend
   npm install
   npm run dev
   # Runs at http://localhost:5173
   ```

5. **Run Integration & RBAC Test Suite:**
   ```powershell
   $env:PYTHONPATH="backend"
   python backend/tests/run_tests.py
   pytest backend/tests/test_api.py -v
   ```

---

### Option B: Docker Compose (Full Stack with TimescaleDB & Redis)

Prerequisites: Docker & Docker Compose.

```bash
docker-compose up --build
```
This boots:
- **`timescaledb`**: PostgreSQL 16 with TimescaleDB time-series hypertable extensions on port `5432`.
- **`redis`**: Message queue & cache on port `6379`.
- **`backend`**: FastAPI application on port `8000`.
- **`crawler_worker`**: Celery worker executing distributed crawler jobs.

Open **`http://localhost:8000`** in your browser.

---

## 2. Default RBAC Credentials

The platform enforces strict server-side Role-Based Access Control (**Admin**, **Analyst**, **Viewer**). The frontend includes a 1-click role switcher in the top navigation bar for immediate testing:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin@omway.com` | `admin123` | Full access: Manage watchlist & config sync, trigger/monitor crawl runs, manage user accounts & roles, control background crawler scheduler, export retraining datasets |
| **Analyst** | `analyst@omway.com` | `analyst123` | Analytical access: View all data, correct news categorization (audit logged), export comprehensive analytical reports in CSV or JSON format |
| **Viewer** | `viewer@omway.com` | `viewer123` | Read-only access: View interactive charts, behavioral metrics, and news feeds. Strict 403 Forbidden on exports, edits, and admin functions |

---

## 3. Data Sources & Crawling Engine

### Target Portals
1. `merolagani.com` — Financial reports, breaking announcements, dividend calls.
2. `sharesansar.com` — Market commentary, corporate disclosures, floorsheet turnover.
3. `nepsealpha.com` — Technical analysis signals and macro updates.
4. `bizmandu.com` — Economic policy, monetary announcements, corporate leadership.

### Crawling Architecture
- **Unattended Background Scheduler**: Periodic asynchronous runner in `backend/app/crawler/scheduler.py` executing unattended crawl passes at configurable intervals (e.g., every 30 minutes). Toggleable and configurable in real-time from the Admin Operations Center.
- **Queue & Worker**: Thread-safe async queue decoupling request triggers from crawl execution.
- **Rate Limiting**: Per-domain token bucket enforcing a 2.0-second delay between requests to protect portal health.
- **Robots.txt**: Validates crawler permissions via `urllib.robotparser` before fetching.
- **URL Deduplication**: Pre-insertion checks ensure zero duplicate news items.
- **Failure Resilience**: Errors (network timeouts, CAPTCHAs, bot blocks) are caught, stored in `crawl_logs`, and surfaced in the Admin view.
- **Pre-seeded Dataset**: Includes 30 days of OHLCV, 790+ floorsheet transactions, and historical articles for guaranteed zero-downtime evaluation.

---

## 4. Automatic News Categorization Approach & Justification

### Approach: Hybrid Entity-Aware NLP + Proximity Confidence Scoring
1. **Multi-Label Entity Extractor**: Analyzes headlines and bodies against company symbols, official names, and aliases from `config/companies.json`.
2. **Contextual Weighting**:
   - Headline match receives primary weight ($+0.55$ to $+0.90$).
   - Body frequency and financial event proximity (e.g. *dividend*, *net profit*, *quarterly report*) scale logarithmically.
   - Generates normalized multi-label confidence scores $P(\text{Company}_i | \text{Article}) \in [0.50, 0.98]$.
3. **Analyst Correction & Model Retraining Loop**:
   - An Analyst or Admin can re-tag articles, modify confidence scores, or add missing tickers via `POST /api/news/:id/recategorize`.
   - Every modification is written to `categorization_corrections` with analyst credentials, timestamp, and notes.
   - Retraining datasets can be audited and exported directly in CSV or JSON via `GET /api/news/corrections/export` or the Admin Ops Center UI for offline supervised fine-tuning.

### Technical Justification & Trade-offs
- **High Precision on Ticker Entities**: In financial markets, symbol collisions and company names require strict word-boundary matching.
- **Sub-Millisecond Inference**: Pure Python tokenization executes in under 2ms per article on commodity hardware without external API billing or GPU cold starts.
- **Explainability**: Analysts can inspect why a confidence score was assigned.

---

## 5. Buyer & Seller Behavior Analysis (Section 3 Deliverable)

Full details are documented in [FINDINGS_SUMMARY.md](file:///c:/Users/milan/OneDrive/Desktop/Omway%20Technology%20Project/FINDINGS_SUMMARY.md).

1. **VWAP vs. Closing Price**:
   $$\text{VWAP} = \frac{\sum (\text{Typical Price}_t \times \text{Volume}_t)}{\sum \text{Volume}_t}$$
   Quantifies smart money accumulation ($\text{Close} > \text{VWAP}$) versus retail liquidation ($\text{Close} < \text{VWAP}$).
2. **Buy/Sell Pressure Indicator (0–100 Scale)**:
   Derived from the Close Location Value (CLV) and volume momentum amplification to measure intraday taker conviction.
3. **Volume Anomaly Detection ($Z > 2.0$)**:
   Computes a 20-day rolling mean ($\mu_{20}$) and standard deviation ($\sigma_{20}$). Days exceeding $Z > 2.0$ trigger visual chart halos and live WebSocket alerts.
4. **Floorsheet Broker Concentration**:
   Aggregates buy vs. sell volume across all broker IDs to rank the Top 5 Accumulators vs. Top 5 Distributers.
5. **News Impact Event Study**:
   Correlates news publication on day $T$ with next-day ($T+1$) price return and volume expansion.

---

## 6. Architecture & Non-Functional Requirements

- **Watchlist Config-Driven & Zero-Babysitting**:
  - Add or remove companies simply by editing [companies.json](file:///c:/Users/milan/OneDrive/Desktop/Omway%20Technology%20Project/config/companies.json) or using the Admin Watchlist Manager UI / API (`POST /api/companies`).
  - **Zero Babysitting Automation**: Newly added companies are automatically provisioned with 30 days of baseline OHLCV price history and realistic floorsheet transactions via `seed_single_company_telemetry` and `sync_companies_from_config` without requiring manual database intervention.
- **Server-Side RBAC Enforcement**:
  - All role boundaries (Admin, Analyst, Viewer) are enforced server-side using FastAPI dependencies (`require_role`).
  - Report exports and recategorization reject Viewers with HTTP `403 Forbidden`.
  - Watchlist modifications, crawler triggers, and user management reject non-Admins with HTTP `403 Forbidden`.
- **Comprehensive Report Exports**:
  - Analysts and Admins can export institutional-grade quantitative summaries (prices, technical indicators, broker concentration, volume anomalies, and news sentiment) in CSV or JSON via `GET /api/reports/export` or the modal UI.
- **No Hard-coded Secrets**: All keys, database URIs, and rate limits load through environment variables (`.env`).
- **Real-time WebSockets**: `/ws/updates` pushes live price updates, crawl completions, and volume anomaly alerts to connected dashboards.
- **Interactive OpenAPI Documentation**: Available at `http://localhost:8000/docs` and `http://localhost:8000/redoc`.

---

## 7. Bonus Features Implemented

1. **Next-Day Price Direction Classifier**:
   - Pure-Python probabilistic momentum classifier predicting $P(\text{UP})$ vs $P(\text{DOWN})$ using 3D/5D returns, volume ratios, and news sentiment.
2. **Real-Time Volume Anomaly Alerting**:
   - Instant WebSocket notification popups with audio/visual banners when volume spikes exceed $Z > 2.0$.
3. **Unattended Scheduler & Crawler Operations**:
   - Automated periodic execution with dynamic interval adjustment and live health monitoring.
4. **CI Pipeline**:
   - GitHub Actions workflow (`.github/workflows/ci.yml`) running Flake8 linting, full integration tests, and Vite build validation.

---

## 8. Repository Structure

```
Omway Technology Project/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app & static file mounting
│   │   ├── config.py            # Environment configuration
│   │   ├── database.py          # SQLAlchemy async session & engine
│   │   ├── models/              # Company, OHLCV, Floorsheet, News, User, CrawlLog, Correction
│   │   ├── schemas/             # Pydantic v2 validation & serialization schemas
│   │   ├── api/                 # Auth, Companies, News, Behavior, Admin, Reports, WebSocket
│   │   ├── crawler/             # Scrapers, rate limiter, robots.txt, async queue, scheduler
│   │   ├── analytics/           # VWAP, Pressure, Anomalies, Floorsheets, Event study
│   │   └── ml/                  # Categorizer, Bonus price-direction classifier, Seeder
│   ├── tests/
│   │   ├── run_tests.py         # Automated integration test runner
│   │   └── test_api.py          # Pytest suite with strict RBAC verification
│   ├── init_db.py               # Database setup and seed verification script
│   ├── requirements.txt         # Python dependencies
│   └── Dockerfile               # Backend container configuration
├── frontend/
│   ├── src/
│   │   ├── components/          # Candlestick chart, floorsheet, news, matrix, admin, report export
│   │   ├── context/             # AuthContext with 1-click RBAC switching
│   │   ├── services/            # API client with token injection & error handling
│   │   ├── App.jsx              # Main reactive application layout
│   │   └── index.css            # Dark mode Bloomberg/TradingView design tokens
│   ├── package.json
│   └── vite.config.js
├── config/
│   └── companies.json           # Tracked companies configuration
├── .github/workflows/ci.yml     # Automated CI pipeline
├── docker-compose.yml           # Full-stack Docker deployment
├── FINDINGS_SUMMARY.md          # Section 3 Written Findings Deliverable
└── README.md                    # Project documentation
```
