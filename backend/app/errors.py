"""Consistent error envelope (RFC 9457 Problem Details) — BR-7, §7.1.

Never leak stack traces or raw DB errors to clients (FM-07 / §8.1).
"""
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class DomainError(Exception):
    """Base for business-rule violations mapped to HTTP responses."""

    status_code = 400
    title = "Bad Request"

    def __init__(self, detail: str):
        self.detail = detail
        super().__init__(detail)


class NotFoundError(DomainError):
    status_code = 404
    title = "Not Found"


class ConflictError(DomainError):
    """Duplicate SKU/email, or insufficient stock (BR-1, BR-2, BR-4)."""

    status_code = 409
    title = "Conflict"


def _problem(request: Request, status: int, title: str, detail: str) -> JSONResponse:
    trace_id = getattr(request.state, "correlation_id", None)
    body = {
        "type": "about:blank",
        "title": title,
        "status": status,
        "detail": detail,
        "instance": str(request.url.path),
        "traceId": trace_id,
    }
    return JSONResponse(status_code=status, content=body, headers={"X-Correlation-ID": trace_id or ""})


def register_exception_handlers(app) -> None:
    @app.exception_handler(DomainError)
    async def _domain(request: Request, exc: DomainError):
        return _problem(request, exc.status_code, exc.title, exc.detail)

    @app.exception_handler(RequestValidationError)
    async def _validation(request: Request, exc: RequestValidationError):
        # Pydantic boundary validation failure -> 422 (BR-9).
        return _problem(
            request,
            422,
            "Unprocessable Entity",
            "; ".join(f"{'.'.join(str(p) for p in e['loc'])}: {e['msg']}" for e in exc.errors()),
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http(request: Request, exc: StarletteHTTPException):
        return _problem(request, exc.status_code, exc.detail if isinstance(exc.detail, str) else "Error", str(exc.detail))

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception):
        # True server fault -> 500, but never expose internals (§8.1).
        import logging

        logging.getLogger("ioms").exception("unhandled_exception", extra={"path": request.url.path})
        return _problem(request, 500, "Internal Server Error", "An unexpected error occurred.")
