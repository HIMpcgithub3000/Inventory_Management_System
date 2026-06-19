# Deployment & Submission Playbook

The deliverable is not "done" until it is reachable at public URLs and the four
submission artifacts exist. This is the executable checklist.

## 0. Pre-deployment gate (do this first)

```bash
cp .env.example .env
docker compose up --build
# In another terminal, prove the core behavior locally:
bash scripts/smoke.sh http://localhost:8000
```
All checks must pass locally before deploying.

## 1. Database — managed Postgres (free)

Use **Neon** (recommended), Supabase, Render PostgreSQL, or Railway PostgreSQL.

1. Create a project → a database. Copy the connection string.
2. Convert it to SQLAlchemy form: `postgresql+psycopg://USER:PASSWORD@HOST/DB?sslmode=require`.
3. Migrations run automatically on backend boot (`alembic upgrade head`).

## 2. Backend — Render (Docker)

**Option A — deploy from the repo:**
1. Render → New → **Web Service** → connect the GitHub repo.
2. Root directory: `backend`. Environment: **Docker**.
3. Environment variables:
   - `DATABASE_URL` = the SQLAlchemy URL from step 1
   - `CORS_ORIGINS` = your frontend origin (fill after step 3, then redeploy)
   - `ENVIRONMENT` = `production`
4. Render injects `$PORT`; the entrypoint binds to it. Deploy.
5. Verify: `https://<service>.onrender.com/health` → `{"status":"ok"}`, and `/docs` loads.

**Option B — deploy the Docker Hub image:** point the Web Service at
`docker.io/USER/ioms-backend:latest` and set the same env vars.

> Railway or Fly.io work equally well — see ADR-004. On Fly: `fly launch` in
> `backend/`, `fly secrets set DATABASE_URL=… CORS_ORIGINS=… ENVIRONMENT=production`.

## 3. Frontend — Vercel

1. Vercel → New Project → import the repo. Root directory: `frontend`.
2. Framework preset: **Vite**. Build: `npm run build`. Output: `dist`.
3. Environment variable: `VITE_API_URL` = your **live backend URL** (from step 2).
4. Deploy. Note the URL, e.g. `https://ioms.vercel.app`.
5. **Go back to the backend** and set `CORS_ORIGINS` to that exact origin; redeploy.

> Netlify works too: set `VITE_API_URL`, build `npm run build`, publish `dist`, and add
> an SPA redirect `/* /index.html 200`.

## 4. Publish the backend image to Docker Hub (required artifact)

```bash
docker build -t USER/ioms-backend:1.0.0 -t USER/ioms-backend:latest ./backend
docker login
docker push USER/ioms-backend:1.0.0
docker push USER/ioms-backend:latest
```
Make the repository public. (CI does this automatically on push — see
`.github/workflows/ci.yml`; add `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` repo secrets.)

## 5. Verify the live system

```bash
bash scripts/smoke.sh https://<your-backend-url>
```
Then open the live frontend, create a product → customer → order, watch stock drop
and the dashboard update. Check the browser console for any CORS/mixed-content errors.

## 6. The four submission artifacts

1. GitHub repository link (frontend + backend, this README).
2. Docker Hub backend image link.
3. Live frontend URL.
4. Live backend API URL (`/docs` reachable).

Put all four at the top of `README.md`.
