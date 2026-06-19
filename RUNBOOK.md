# RUNBOOK — IOMS operations

Short, practical recovery steps for the most common failure modes.

## 1. Backend won't start

**Symptoms:** `backend` container exits/restarts; `/health` unreachable.

Check:
```bash
docker compose logs backend --tail=80
```
- **`alembic upgrade head` fails** → the DB isn't reachable or is mid-startup.
  Confirm `db` is healthy: `docker compose ps`. The backend `depends_on` waits for
  the DB healthcheck, so this usually self-resolves on retry. If the migration itself
  errors, read the Alembic traceback — a bad/edited migration is the usual cause.
- **`DATABASE_URL` wrong** → verify it's set (Compose builds it from `POSTGRES_*`).
  In production confirm the platform env var is the full managed-DB URL.
- **Port binding** → in prod the app must bind `$PORT`; the entrypoint already does.

## 2. Database connection refused

**Symptoms:** backend logs `connection refused` / `could not connect to server`.

- Local: `docker compose ps` → is `db` healthy? If not: `docker compose logs db`.
- The DB port is intentionally **not** published to the host; connect via the
  internal network (`db:5432`) from the backend, or `docker compose exec db psql`.
- Managed DB: check the connection string, that the instance is awake (free tiers
  sleep), and that the backend host is allow-listed in the provider's IP rules.
- Recover a wedged local DB: `docker compose restart db`. Data persists in `pgdata`.

## 3. Frontend can't reach backend / CORS errors

**Symptoms:** browser console shows CORS blocked, `Network Error`, or 4xx/5xx on API calls.

- **CORS**: backend `CORS_ORIGINS` must list the **exact** frontend origin
  (scheme + host, no trailing slash), e.g. `https://ioms.vercel.app`. Not `*` in prod.
  Update the env var and redeploy the backend.
- **Wrong API base URL**: the SPA bakes `VITE_API_URL` at **build** time. If you
  changed the backend URL, rebuild/redeploy the frontend.
- **Mixed content**: an HTTPS page calling an HTTP API is blocked. Both must be HTTPS.
- Verify directly: `curl -s https://<backend>/health` should return `{"status":"ok"}`.

## 4. "Insufficient stock" when stock looks available

- Remember stock is decremented atomically on order creation and **restored** on
  order cancellation. Check current value: `GET /products/{id}`.
- Under concurrency, exactly one of two simultaneous orders for the last unit wins;
  the other correctly gets 409. This is by design (ADR-003).

## 5. Reset local environment

```bash
docker compose down -v   # ⚠ removes the pgdata volume (all local data)
docker compose up --build
```

## Health endpoints

- `GET /health` — liveness (always 200 if the process is up).
- `GET /health/ready` — readiness; returns 503 if the DB is unreachable.
