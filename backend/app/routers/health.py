"""Health probes (FM-05 floor / §9.1). /health is the platform liveness probe;
/health/ready additionally verifies DB connectivity."""
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.schemas import HealthOut

router = APIRouter(tags=["health"])
settings = get_settings()


@router.get("/health", response_model=HealthOut)
def health() -> HealthOut:
    return HealthOut(status="ok", service=settings.app_name, version=settings.app_version)


@router.get("/health/live", response_model=HealthOut)
def live() -> HealthOut:
    return HealthOut(status="ok", service=settings.app_name, version=settings.app_version)


@router.get("/health/ready")
def ready(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse(status_code=503, content={"status": "db_unavailable"})
    return {"status": "ready"}
