# Render Cloud Deployment Guide
### Omway Technologies — NEPSE Stock Market Intelligence Platform

This repository is pre-configured for automated zero-downtime deployment on **Render** with **Supabase PostgreSQL (Native Table Partitioning)**.

---

## Architecture Overview on Render

- **Runtime**: Python 3.11 with Node.js 20 build-phase integration.
- **Unified Single-Service Monolith**:
  - The React frontend is compiled during the build phase (`frontend/dist`).
  - FastAPI serves the frontend Single Page Application (SPA), all REST API routes (`/api/*`), and real-time WebSockets (`/ws/updates`) from the same service.
  - Zero CORS configuration required.
- **Database**: Cloud Supabase PostgreSQL with 122 native declarative range partitions (`floorsheets` and `ohlcv_data`).

---

## Method 1: Automated Blueprint Deployment (Recommended — 2 Minutes)

Render provides native support for `render.yaml` ("Infrastructure as Code"):

1. **Commit and Push Code to GitHub / GitLab:**
   ```bash
   git add .
   git commit -m "feat: configure Supabase native partitioning and Render deployment"
   git push origin main
   ```

2. **Open Render Dashboard:**
   - Go to [https://dashboard.render.com](https://dashboard.render.com).
   - Click **New +** in the top navigation bar.
   - Select **Blueprint**.

3. **Connect Repository:**
   - Choose your GitHub repository (`milanmagrati/Stock-Market-Application`).
   - Render will detect [`render.yaml`](./render.yaml).

4. **Click "Apply":**
   - Render will automatically provision the Web Service, inject the environment variables, build the React frontend, install backend requirements, and verify Supabase database partitions.

---

## Method 2: Manual Web Service Setup (Step-by-Step)

If you prefer configuring through the Render Web UI:

### Step 1: Create Web Service
1. In Render Dashboard, click **New +** -> **Web Service**.
2. Select **Build and deploy from a Git repository** and connect your repository.

### Step 2: Configure Service Parameters
| Field | Value | Notes |
|---|---|---|
| **Name** | `omway-nepse-intelligence` | Or any name you prefer |
| **Region** | `Singapore (Southeast Asia)` | Closest to Nepal / Supabase Singapore region |
| **Branch** | `main` | Production branch |
| **Runtime** | `Python` | Native Python runtime (includes Node.js) |
| **Build Command** | `bash build.sh` | Builds React app & installs Python dependencies |
| **Start Command** | `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT --app-dir backend` | Uses Render's dynamic `$PORT` |
| **Instance Type** | `Free` (or `Starter`) | 512MB RAM is sufficient |

### Step 3: Configure Environment Variables
Under the **Environment Variables** section, add the following key-value pairs:

```env
PYTHON_VERSION=3.11.9
NODE_VERSION=20.11.0
ENVIRONMENT=production
PROJECT_NAME="NEPSE Stock Market Intelligence"
SECRET_KEY=omway-super-secret-key-change-in-production-stock-market-app
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

DATABASE_URL=postgresql+psycopg://postgres.iiqroreouvctigndyxxf:Stock2026%40%40%23%23@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres

SUPABASE_DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres.iiqroreouvctigndyxxf
SUPABASE_DB_PASSWORD=Stock2026@@##
SUPABASE_URL=https://iiqroreouvctigndyxxf.supabase.co

REDIS_URL=redis://localhost:6379/0
CRAWL_INTERVAL_MINUTES=60
DEFAULT_USER_AGENT="OmwayStockBot/1.0 (+https://omwaytech.com/bot; research@omwaytech.com)"
REQUEST_TIMEOUT_SECONDS=15.0
PER_DOMAIN_RATE_LIMIT_SECONDS=2.0
VOLUME_ANOMALY_ZSCORE_THRESHOLD=2.0
ROLLING_WINDOW_DAYS=20
```

### Step 4: Health Check Path
Under **Advanced**:
- Set **Health Check Path** to `/api/health`.

### Step 5: Deploy
- Click **Create Web Service**.

---

## Verification After Deployment

Once the build finishes and shows **Live**:

1. **Test Health Endpoint:**
   - Visit: `https://<your-service-name>.onrender.com/api/health`
   - Should return:
     ```json
     {"status":"HEALTHY","service":"NEPSE Stock Market Intelligence","environment":"production"}
     ```

2. **Access the Web Dashboard:**
   - Visit: `https://<your-service-name>.onrender.com`
   - The reactive trading dashboard will load with live data from Supabase.

3. **Login & Role Switching:**
   - Use the 1-click role switcher in the navbar or log in:
     - **Admin**: `admin@omway.com` / `admin123`
     - **Analyst**: `analyst@omway.com` / `analyst123`
     - **Viewer**: `viewer@omway.com` / `viewer123`

4. **Verify Supabase Native Partitions:**
   - As Admin, inspect active partitions at:
     `GET https://<your-service-name>.onrender.com/api/admin/partitions`
   - Returns 122 active declarative partition tables in Supabase Postgres.

---

## Keeping Render Active 24/7 (cron-job.org Setup)

Render's free tier spins down web services after **15 minutes of inactivity**, causing initial 30-50 second cold-start latency when users open the app.

### Why `Failed (output too large)` Happened Previously:
When pinging the root domain (e.g. `https://<service-name>.onrender.com/`), the server serves the entire Single-Page Application (HTML, scripts, styles). `cron-job.org` free accounts limit execution output logs to a few kilobytes, causing the job to fail with **"Failed (output too large)"**.

### The Solution:
We implemented an ultra-lightweight keep-alive endpoint:
- **URL**: `https://<your-service-name>.onrender.com/health/` (or `https://<your-domain>/health/`)
- **Response**: 2-byte plain text `OK` (identical to `https://milanmagrati.com.np/health/`)
- **Headers**: Non-cacheable (`Cache-Control: no-cache, no-store, must-revalidate`), resetting Render's 15-minute sleep timer on every ping.

### Configuration on cron-job.org:
1. **Title**: `Omway NEPSE Keepalive`
2. **URL**: `https://<your-service-name>.onrender.com/health/`
3. **Execution Schedule**: Every **10 minutes** (or **14 minutes** — MUST be under 15 minutes)
4. **Request Method**: `GET` or `HEAD`
5. **Expected Output**: `OK` (Execution time ~1-2s, 100% Successful)
