"""Pytest fixtures. Runs against a REAL PostgreSQL test database so the guarded
UPDATE / concurrency behavior is exercised exactly as in production.

Set TEST_DATABASE_URL (falls back to DATABASE_URL, then a local default).
"""
import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

# Point the app at the test DB BEFORE importing app modules (settings is cached).
TEST_DB_URL = os.getenv(
    "TEST_DATABASE_URL",
    os.getenv("DATABASE_URL", "postgresql+psycopg://ioms:ioms@localhost:5432/ioms_test"),
)
os.environ["DATABASE_URL"] = TEST_DB_URL

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app import models  # noqa: F401,E402


@pytest.fixture(scope="session", autouse=True)
def _schema():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def _clean_tables():
    with engine.begin() as conn:
        conn.execute(
            text("TRUNCATE order_lines, orders, products, customers RESTART IDENTITY CASCADE")
        )
    yield


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
