import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
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
FRONTEND_DIST_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"


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

if (FRONTEND_DIST_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST_DIR / "assets"), name="frontend-assets")


def _render_spa_or_template(default_template: str = "dashboard.html"):
    dist_index = FRONTEND_DIST_DIR / "index.html"
    if dist_index.exists():
        return HTMLResponse(content=dist_index.read_text(encoding="utf-8"))
    template_file = TEMPLATES_DIR / default_template
    if template_file.exists():
        return HTMLResponse(content=template_file.read_text(encoding="utf-8"))
    return HTMLResponse(content="<h1>WellTrack API Aktif</h1><p>Buka <a href='/docs'>/docs</a></p>")


@app.get("/logo-icon.svg", include_in_schema=False)
def serve_logo_icon():
    icon_file = FRONTEND_DIST_DIR / "logo-icon.svg"
    if icon_file.exists():
        return FileResponse(icon_file)
    return HTMLResponse(status_code=404)


@app.get("/logo-text.svg", include_in_schema=False)
def serve_logo_text():
    text_file = FRONTEND_DIST_DIR / "logo-text.svg"
    if text_file.exists():
        return FileResponse(text_file)
    return HTMLResponse(status_code=404)


@app.get("/", response_class=HTMLResponse, tags=["Web App"])
def index_page():
    return _render_spa_or_template("dashboard.html")


@app.get("/dashboard", response_class=HTMLResponse, tags=["Web App"])
@app.get("/login", response_class=HTMLResponse, tags=["Web App"])
@app.get("/register", response_class=HTMLResponse, tags=["Web App"])
@app.get("/targets", response_class=HTMLResponse, tags=["Web App"])
@app.get("/analytics", response_class=HTMLResponse, tags=["Web App"])
@app.get("/gamification", response_class=HTMLResponse, tags=["Web App"])
@app.get("/profile", response_class=HTMLResponse, tags=["Web App"])
def spa_routes():
    return _render_spa_or_template("dashboard.html")


@app.get("/auth", response_class=HTMLResponse, tags=["Web App"])
@app.get("/test-auth", response_class=HTMLResponse, tags=["Web App"])
def auth_page():
    return _render_spa_or_template("test_auth.html")


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}


@app.get("/health/db", tags=["Health"])
def health_db(db: DbSession):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "ok"}
