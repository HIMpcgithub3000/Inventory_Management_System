ADR-002: ORM and migration tool — SQLAlchemy 2.x + Alembic
Status: Accepted
Context: We need a reproducible, deterministic schema (FM-06) and parameterized
  queries only (no string-built SQL — §8.3 / AP).
Decision: SQLAlchemy 2.0 (typed Mapped models) as the ORM; Alembic for migrations.
  psycopg 3 as the driver.
Rationale:
  - The ORM parameterizes all queries by construction, eliminating SQL injection.
  - Alembic gives versioned, reviewable migrations; a single `alembic upgrade head`
    in the container entrypoint makes a fresh `docker compose up` yield a working DB.
  - Numeric(18,4) maps to Python Decimal, enforcing exact money math (AP-5).
Consequences:
  + Schema is code-reviewed and reproducible across environments.
  + Expand-contract migrations are possible for future breaking changes.
  - One initial migration must be kept in sync with the models (covered by tests
    that create the schema from metadata and exercise every constraint).
Alternatives considered:
  - create_all() on boot: simpler but not versioned; rejected as the source of truth.
