import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import engine
from app.core.dependencies import DbSession
from app.core.errors import build_validation_payload

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("welltrack")

TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="REST API WellTrack: pelacak dan manajemen kesehatan pribadi.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content=build_validation_payload(exc.errors()))


@app.exception_handler(SQLAlchemyError)
async def database_error_handler(request: Request, exc: SQLAlchemyError):
    logger.exception("Database error pada %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Terjadi kesalahan pada server. Data tidak tersimpan."},
    )


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception):
    logger.exception("Error tak terduga pada %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Terjadi kesalahan pada server."},
    )


app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/", response_class=HTMLResponse, tags=["Web App"])
def index_page():
    dashboard_file = TEMPLATES_DIR / "dashboard.html"
    if dashboard_file.exists():
        return HTMLResponse(content=dashboard_file.read_text(encoding="utf-8"))
    auth_file = TEMPLATES_DIR / "test_auth.html"
    if auth_file.exists():
        return HTMLResponse(content=auth_file.read_text(encoding="utf-8"))
    return HTMLResponse(content="<h1>WellTrack API Aktif</h1><p>Buka <a href='/docs'>/docs</a></p>")


@app.get("/dashboard", response_class=HTMLResponse, tags=["Web App"])
def dashboard_page():
    dashboard_file = TEMPLATES_DIR / "dashboard.html"
    if dashboard_file.exists():
        return HTMLResponse(content=dashboard_file.read_text(encoding="utf-8"))
    return HTMLResponse(content="<h1>Dashboard belum ditemukan</h1>", status_code=404)


@app.get("/auth", response_class=HTMLResponse, tags=["Web App"])
@app.get("/test-auth", response_class=HTMLResponse, tags=["Web App"])
def auth_page():
    template_file = TEMPLATES_DIR / "test_auth.html"
    if template_file.exists():
        return HTMLResponse(content=template_file.read_text(encoding="utf-8"))
    return HTMLResponse(content="<h1>Halaman autentikasi belum ditemukan</h1>", status_code=404)


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}


@app.get("/health/db", tags=["Health"])
def health_db(db: DbSession):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "ok"}
