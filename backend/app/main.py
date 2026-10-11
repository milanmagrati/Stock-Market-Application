from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.database import engine, Base, AsyncSessionLocal
from app.ml.seed_data import seed_database
from app.partitions import setup_native_partitions
from app.crawler.scheduler import crawler_queue
from app.api.websocket import ws_manager, ws_router
from app.api.auth import auth_router
from app.api.companies import companies_router
from app.api.news import news_router
from app.api.behavior import behavior_router
from app.api.admin import admin_router
from app.api.reports import reports_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize database tables & PostgreSQL native partitions
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await setup_native_partitions(conn)

    # 2. Seed database with initial watchlist, users, 30d OHLCV, floorsheets, news
    async with AsyncSessionLocal() as session:
        await seed_database(session)

    # 3. Start crawler queue worker and wire WebSocket broadcaster
    crawler_queue.set_broadcaster(ws_manager)
    await crawler_queue.start()

    yield

    # Shutdown crawler worker
    await crawler_queue.stop()

app = FastAPI(
    title="NEPSE Stock Market Intelligence API",
    description=(
        "Production-grade backend for the Nepal Stock Exchange (NEPSE). "
        "Provides multi-portal financial news crawling, automated multi-label AI categorization, "
        "buyer/seller behavioral analysis (VWAP, pressure indicator, 20-day volume anomalies, broker concentration), "
        "and real-time WebSocket telemetry with strict server-side Role-Based Access Control (RBAC)."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.responses import JSONResponse, FileResponse, PlainTextResponse, Response
from pathlib import Path
from fastapi.staticfiles import StaticFiles

frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

# Centralized Validation and Error Handling
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 404 and not request.url.path.startswith(("/api", "/ws", "/health", "/ping")):
        index_file = frontend_dist / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error_type": "HTTPException",
            "status_code": exc.status_code,
            "detail": exc.detail
        }
    )


from fastapi.encoders import jsonable_encoder

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error_type": "ValidationError",
            "detail": jsonable_encoder(exc.errors())
        }
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error_type": "InternalServerError",
            "detail": "An internal error occurred. Please contact system administrator."
        }
    )

# Include Routers
app.include_router(auth_router)
app.include_router(companies_router)
app.include_router(news_router)
app.include_router(behavior_router)
app.include_router(admin_router)
app.include_router(reports_router)
app.include_router(ws_router)

# Keepalive Health Endpoints (Optimized for cron-job.org & Render uptime monitoring)
@app.api_route("/health", methods=["GET", "HEAD"], tags=["Health"])
@app.api_route("/health/", methods=["GET", "HEAD"], include_in_schema=False)
@app.api_route("/ping", methods=["GET", "HEAD"], tags=["Health"])
@app.api_route("/ping/", methods=["GET", "HEAD"], include_in_schema=False)
async def keepalive_health_check(request: Request):
    """
    Ultra-lightweight keep-alive endpoint for cron-job.org, Render health checks,
    and external uptime monitors. Returns a 2-byte 'OK' response to prevent
    'output too large' errors on cron-job.org and keep the Render service active.
    """
    headers = {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
    }
    if request.method == "HEAD":
        return Response(status_code=status.HTTP_200_OK, media_type="text/plain", headers=headers)
    
    # Optional JSON format support if requested
    accept = request.headers.get("accept", "")
    format_query = request.query_params.get("format", "").lower()
    if format_query == "json" or (accept == "application/json" and not request.query_params.get("plain")):
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"status": "OK"},
            headers=headers
        )

    return PlainTextResponse("OK", status_code=status.HTTP_200_OK, headers=headers)

@app.api_route("/api/health", methods=["GET", "HEAD"], tags=["Health"])
@app.api_route("/api/health/", methods=["GET", "HEAD"], include_in_schema=False)
async def api_health_check(request: Request):
    headers = {
        "Cache-Control": "no-cache, no-store, must-revalidate"
    }
    if request.method == "HEAD":
        return Response(status_code=status.HTTP_200_OK, headers=headers)
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "status": "HEALTHY",
            "service": settings.PROJECT_NAME,
            "environment": settings.ENVIRONMENT
        },
        headers=headers
    )

# Dual-purpose root endpoint for https://omway-nepse-intelligence.onrender.com/
# 1) If pinged by cron-job.org or uptime bots: returns a 2-byte 'OK' to prevent "output too large"
# 2) If opened by human users in a browser: serves the full trading application frontend
@app.api_route("/", methods=["GET", "HEAD"], include_in_schema=False)
async def root_index(request: Request):
    headers = {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
    }
    if request.method == "HEAD":
        return Response(status_code=status.HTTP_200_OK, media_type="text/plain", headers=headers)

    user_agent = request.headers.get("user-agent", "").lower()
    is_cron = any(bot in user_agent for bot in [
        "cron-job", "cronjob", "uptimerobot", "pingdom", "betteruptime", "render", "healthcheck", "keepalive", "curl"
    ])
    has_keepalive_param = any(k in request.query_params for k in ["keepalive", "health", "ping"])

    if is_cron or has_keepalive_param:
        return PlainTextResponse("OK", status_code=status.HTTP_200_OK, headers=headers)

    index_file = frontend_dist / "index.html"
    if index_file.exists():
        return FileResponse(index_file)

    return PlainTextResponse("OK", status_code=status.HTTP_200_OK, headers=headers)

# Mount static frontend production build if available
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")


