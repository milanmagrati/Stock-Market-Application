from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.database import engine, Base, AsyncSessionLocal
from app.ml.seed_data import seed_database
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
    # 1. Initialize database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

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

# Centralized Validation and Error Handling
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error_type": "HTTPException",
            "status_code": exc.status_code,
            "detail": exc.detail
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error_type": "ValidationError",
            "detail": exc.errors()
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

@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "HEALTHY",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT
    }

# Mount static frontend production build if available
from pathlib import Path
from fastapi.staticfiles import StaticFiles

frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")

