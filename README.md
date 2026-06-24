# IOMS — Inventory & Order Management System

A production-minded, fully containerized full-stack system to manage **Products,
Customers, Orders, and Inventory**. React SPA + Python/FastAPI API + PostgreSQL,
orchestrated with Docker Compose and deployable to free hosting.



## Architecture

```
┌──────────────┐   HTTPS / REST + JSON    ┌─────────────────────────────┐
│  React SPA   │ ───────────────────────▶ │  FastAPI backend (1 service)│
│ (Vite+nginx) │ ◀─────────────────────── │  modules: products,         │
└──────────────┘   CORS-locked origin     │  customers, orders, stats   │
                                           └──────────────┬──────────────┘
                                                          │ psycopg (internal net)
                                                          ▼
                                              ┌────────────────────────┐
                                              │  PostgreSQL (named vol) │
                                              └────────────────────────┘
```

Three Compose services: **frontend**, **backend**, **db**. The DB port is **not**
published to the host — only the backend reaches it over the internal network.

### Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18 (JavaScript), Vite, React Router, **TanStack Query** (server state), Tailwind CSS |
| Backend | **Python 3.12 + FastAPI**, SQLAlchemy 2.x, Alembic, Pydantic v2, Gunicorn/Uvicorn |
| Database | **PostgreSQL 16** |
| Container | Docker (multi-stage, non-root, slim images) + Docker Compose |

Design decisions are recorded as ADRs in [`docs/adr/`](docs/adr).

---

## Quick start (local, one command)

Prerequisites: Docker Desktop (Docker + Compose v2).

```bash
cp .env.example .env       # adjust POSTGRES_PASSWORD etc. if you like
docker compose up --build  # builds + starts db, backend, frontend
```

Then open:

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API docs (Swagger) | http://localhost:8000/docs |
| Health | http://localhost:8000/health |

The backend container runs `alembic upgrade head` on start, so a fresh
`docker compose up` always yields a working, migrated database. PostgreSQL data
persists in the named volume `pgdata` across `docker compose down && up`.

---

## API

Endpoints are served both unversioned (e.g. `/products`) and under `/api/v1`.
Full interactive contract: **`/docs`** (Swagger UI) and **`/openapi.json`**.

| Method & Path | Description | Success | Errors |
|---|---|---|---|
| `POST /products` | Create product | 201 | 409 dup SKU · 422 invalid |
| `GET /products` | List products (`?low_stock=true&threshold=N`) | 200 | |
| `GET /products/{id}` | Get product | 200 | 404 |
| `PUT /products/{id}` | Update product | 200 | 404 · 409 · 422 |
| `DELETE /products/{id}` | Delete product (soft) | 204 | 404 |
| `POST /customers` | Create customer | 201 | 409 dup email · 422 |
| `GET /customers` | List customers | 200 | |
| `GET /customers/{id}` | Get customer | 200 | 404 |
| `DELETE /customers/{id}` | Delete customer (soft) | 204 | 404 |
| `POST /orders` | Create order | 201 | 409 insufficient stock · 404 unknown ref · 422 |
| `GET /orders` | List orders | 200 | |
| `GET /orders/{id}` | Get order + lines | 200 | 404 |
| `DELETE /orders/{id}` | Cancel order (restocks) | 204 | 404 |
| `GET /stats/summary` | Dashboard counts | 200 | |
| `GET /health`, `/health/ready` | Health probes | 200 / 503 | |

### Entity fields

- **Product**: `name`, `sku` (unique), `price` (DECIMAL), `quantity_in_stock` (≥ 0).
- **Customer**: `full_name`, `email` (unique), `phone`.
- **Order**: `customer_id`, `lines: [{product_id, quantity}]`; backend computes
  `total_amount`, `unit_price`/`line_total` per line, and `status`.

Example — create an order:

```bash
curl -X POST http://localhost:8000/orders -H 'content-type: application/json' \
  -d '{"customer_id":"<uuid>","lines":[{"product_id":"<uuid>","quantity":3}]}'
```

---

## Business rules & how each is enforced

| # | Rule | Enforcement |
|---|---|---|
| 1 | SKU unique | Partial unique index (active rows) + friendly 409 pre-check + IntegrityError backstop |
| 2 | Email unique | Same approach, case-insensitive |
| 3 | Stock never negative | `CHECK (quantity_in_stock >= 0)` + guarded UPDATE |
| 4 | Reject insufficient-stock orders | Guarded `UPDATE … WHERE quantity_in_stock >= :qty`; 0 rows → rollback → **409** |
| 5 | Order auto-reduces stock | Same UPDATE, inside the order transaction |
| 6 | Backend computes total | Summed server-side from DB prices; any client `total_amount` is ignored |
| 7 | Proper error handling | RFC-9457 problem envelope; no stack traces leak |
| 8 | Correct HTTP status codes | 200/201/204 · 422 · 404 · 409 · 500 only for true faults |
| 9 | Validate input | Pydantic at the boundary (422 before any DB access) |

The order path (`backend/app/services/orders.py`) is atomic and **all-or-nothing**:
a single failing line rolls back the entire order with **no** partial stock change.
Money is `Decimal`/`NUMERIC(18,4)` end to end; timestamps are `TIMESTAMPTZ`.

---

## Running tests

```bash
cd backend
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
# point at a Postgres (e.g. a throwaway container):
docker run -d --name pg -e POSTGRES_USER=ioms -e POSTGRES_PASSWORD=ioms \
  -e POSTGRES_DB=ioms_test -p 5432:5432 postgres:16-alpine
TEST_DATABASE_URL="postgresql+psycopg://ioms:ioms@127.0.0.1:5432/ioms_test" pytest
```

27 tests cover every endpoint and business rule, including duplicate SKU/email,
insufficient stock (409), unknown refs (404), invalid bodies (422), all-or-nothing
rollback, SKU/email reuse after delete, and a **concurrent double-order on the last
unit** (exactly one 201, one 409).

### End-to-end verification (against a running stack)

```bash
# API + business rules + concurrency (65 checks) — needs httpx (a backend dep):
python scripts/e2e_live.py http://localhost:8000

# Quick shell smoke (9 checks):
bash scripts/smoke.sh http://localhost:8000

# Browser UI flow on desktop + mobile (needs Playwright: npm i playwright && npx playwright install chromium):
node scripts/ui_e2e.mjs
```

The full system has been verified end to end: 27 unit tests, 65 live API checks
(incl. 8 parallel orders for the last unit → exactly one winner, no oversell, and
Decimal exactness with no float drift), browser UI flows on 1280px and 375px with
zero console errors, plus infrastructure checks (non-root containers, slim images,
DB not host-exposed, named-volume persistence across `down`/`up`, idempotent migrations).

---

## Environment variables

| Variable | Used by | Description |
|---|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | db, compose | Local Postgres credentials |
| `DATABASE_URL` | backend | SQLAlchemy URL (`postgresql+psycopg://…`). Set directly in prod. |
| `CORS_ORIGINS` | backend | Comma-separated allowed origins. **Never `*` in prod.** |
| `LOW_STOCK_THRESHOLD` | backend | Dashboard low-stock cutoff (default 10) |
| `ENVIRONMENT` | backend | `development` / `production` |
| `VITE_API_URL` | frontend (build) | Backend base URL the SPA calls |

No credentials are hardcoded anywhere; `.env` is git-ignored, `.env.example` is committed.

---

## Deployment (free tier)

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full step-by-step playbook.
Summary:

1. **Database** — create a Neon (or Supabase/Render/Railway) Postgres; copy its URL.
2. **Backend** — deploy `./backend` to **Render** (Docker) or push the image to
   **Docker Hub** and deploy that. Set `DATABASE_URL`, `CORS_ORIGINS`, `ENVIRONMENT=production`.
   Render injects `$PORT`; the entrypoint binds to it and runs migrations.
3. **Frontend** — deploy `./frontend` to **Vercel/Netlify** with
   `VITE_API_URL=<live backend URL>`.
4. **Wire CORS** — set the backend `CORS_ORIGINS` to the exact deployed frontend origin.
5. **Docker Hub** — `docker build -t USER/ioms-backend:latest ./backend && docker push …`.

---

## Known limitations & enterprise growth path

This ships the graded assessment baseline with production discipline. Deliberately
**out of scope** (documented as the next steps in `docs/adr` and the master design):
Kubernetes/HPA/PDB, transactional outbox + message broker, Redis cache, OpenTelemetry/
Prometheus dashboards, OAuth2/RBAC auth, multi-warehouse reservations, and multi-region
DR. Free tiers are single-region and may cold-start. The architecture (UUID keys,
versionable schema, CQRS-ready read paths, event-friendly order model) is structured so
these can be added without a rewrite.

See [`RUNBOOK.md`](RUNBOOK.md) for common operational failure modes.
