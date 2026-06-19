ADR-004: Free-tier hosting platforms
Status: Accepted
Context: The assessment requires the system deployed at public URLs on free tiers:
  backend on Render/Railway/Fly.io, frontend on Vercel/Netlify, managed PostgreSQL.
Decision:
  - Database: Neon (managed PostgreSQL, free tier, generous, automated backups).
  - Backend: Render Web Service (Docker deploy from the repo or Docker Hub image).
  - Frontend: Vercel (static build of the Vite SPA).
Rationale:
  - All three have zero-cost tiers, HTTPS by default, and Git-based auto-deploy.
  - Render injects $PORT (our entrypoint binds to it); Neon provides a ready
    DATABASE_URL; Vercel inlines VITE_API_URL at build.
Consequences:
  + Public HTTPS URLs with minimal ops; deploys on git push.
  - Free tiers sleep/cold-start and are single-region (AP-11 limitation, documented).
    The Kubernetes/multi-AZ path in PART X/XIII is the growth story, not shipped here.
Alternatives considered:
  - Railway (DB + app together) and Fly.io are equally acceptable; Render+Neon+Vercel
    chosen for the clearest separation and the smoothest free-tier experience.
