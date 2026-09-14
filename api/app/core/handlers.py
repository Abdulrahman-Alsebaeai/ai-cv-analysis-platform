from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

def build_error(code: str, message: str, details=None, status_code: int = 400):
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message, "details": details}},
    )

async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    # Preserve our AppError shape if already formatted
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return build_error("http_error", str(exc.detail), status_code=exc.status_code)

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return build_error(
        "validation_error",
        "Request validation failed",
        details=exc.errors(),
        status_code=422,
    )

async def unhandled_exception_handler(request: Request, exc: Exception):
    return build_error(
        "internal_error",
        "Unexpected server error",
        details=str(exc),
        status_code=500,
    )
