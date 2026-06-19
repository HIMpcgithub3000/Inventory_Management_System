"""FastAPI application entrypoint — the single modular backend service (P5).

Modules (clean internal boundaries): products, customers, orders, inventory(stats).
Endpoints are exposed both unversioned (as the assessment lists them) and under
/api/v1 (versioning discipline, §7.1).
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.errors import register_exception_handlers
from app.logging_config import configure_logging
from app.middleware import CorrelationIdMiddleware
from app.routers import customers, health, orders, products, stats

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    import logging

    logging.getLogger("ioms").info(
        "startup", extra={"version": settings.app_version, "environment": settings.environment}
    )
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Inventory & Order Management System API. See /docs for the full contract.",
    lifespan=lifespan,
)

# CORS locked to known origins (FM-09 / §8.2). Never '*' in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Correlation-ID"],
)
app.add_middleware(CorrelationIdMiddleware)
register_exception_handlers(app)

# Mount every module router twice: bare paths + /api/v1 alias.
for prefix in ("", "/api/v1"):
    app.include_router(health.router, prefix=prefix)
    app.include_router(products.router, prefix=prefix)
    app.include_router(customers.router, prefix=prefix)
    app.include_router(orders.router, prefix=prefix)
    app.include_router(stats.router, prefix=prefix)


@app.get("/", tags=["meta"])
def root():
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/health",
    }
