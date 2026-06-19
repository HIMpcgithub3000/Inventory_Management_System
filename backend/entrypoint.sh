#!/bin/sh
set -e

# Apply migrations (idempotent) before serving. Schema is reproducible from the repo.
echo "Running database migrations…"
alembic upgrade head

# Bind to the platform-provided $PORT (Render/Railway/Fly) or default 8000.
PORT="${PORT:-8000}"
echo "Starting IOMS backend on :${PORT}"
exec gunicorn app.main:app \
  --workers "${WEB_CONCURRENCY:-2}" \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind "0.0.0.0:${PORT}" \
  --access-logfile - \
  --error-logfile - \
  --timeout 60
