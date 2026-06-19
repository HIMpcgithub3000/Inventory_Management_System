ADR-001: Backend framework — FastAPI over Flask
Status: Accepted
Context: The assessment mandates Python with FastAPI or Flask. We need request
  validation, typed responses, and API documentation with minimal plumbing.
Decision: Use FastAPI (Starlette + Uvicorn/Gunicorn).
Rationale:
  - Pydantic validates every request body at the boundary (BR-9) and returns 422
    automatically, exactly matching "validate all request data before processing."
  - OpenAPI 3.1 + Swagger UI are generated for free at /docs and /openapi.json,
    satisfying the API-spec discipline (§7.4) with zero extra work.
  - Native async and first-class dependency injection (get_db session per request).
Consequences:
  + Less boilerplate, self-documenting API, strong typing end to end.
  - Async/sync mixing requires care; we use sync SQLAlchemy sessions deliberately
    for transactional clarity in the order path.
Alternatives considered:
  - Flask + Marshmallow + Flask-Smorest: viable but more wiring for the same result.
