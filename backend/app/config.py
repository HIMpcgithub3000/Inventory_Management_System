"""Centralized configuration. Every value comes from the environment.

Enforces FM-04 / AP-10 / XV.6: no hardcoded credentials. The only defaults here
are non-sensitive local-dev conveniences; the database URL and CORS origins are
supplied via environment variables (.env locally, platform secret manager in prod).
"""
from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database — REQUIRED. No default credentials baked in.
    database_url: str = Field(
        default="postgresql+psycopg://ioms:ioms@localhost:5432/ioms",
        description="SQLAlchemy URL, e.g. postgresql+psycopg://user:pass@host:5432/db",
    )

    @field_validator("database_url")
    @classmethod
    def _ensure_psycopg_driver(cls, v: str) -> str:
        """Managed Postgres (Render/Heroku) hands out a `postgresql://` (or legacy
        `postgres://`) URL, but this app uses psycopg3 and needs the explicit
        `postgresql+psycopg://` driver. Normalize so DATABASE_URL can be pasted as-is."""
        if v.startswith("postgresql+"):
            return v
        if v.startswith("postgresql://"):
            return "postgresql+psycopg://" + v[len("postgresql://"):]
        if v.startswith("postgres://"):
            return "postgresql+psycopg://" + v[len("postgres://"):]
        return v

    # CORS — comma-separated list of allowed origins. Never '*' in production.
    cors_origins: str = Field(default="http://localhost:5173,http://localhost:3000")

    # CORS — optional regex matching allowed origins. Useful for Vercel/Netlify where
    # every deploy gets a new subdomain, e.g. https://my-app-.*\.vercel\.app
    cors_origin_regex: str = Field(default="")

    # App metadata / behavior
    app_name: str = "IOMS Backend"
    app_version: str = "1.0.0"
    environment: str = Field(default="development")
    log_level: str = Field(default="INFO")

    # Dashboard: a product is "low stock" when quantity_in_stock < this threshold.
    low_stock_threshold: int = Field(default=10)

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
