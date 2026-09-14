from __future__ import annotations
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.core.handlers import http_exception_handler, unhandled_exception_handler, validation_exception_handler
from app.core.health import router as health_router
from app.routers.analysis import router as analysis_router
from app.routers.reports import router as reports_router
app = FastAPI(title='CV Analysis API', version='0.2.0')
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)
@app.get('/')
def root(): return {"name":app.title,"version":app.version,"health":"/health","docs":"/docs"}
app.include_router(health_router)
app.include_router(analysis_router)
app.include_router(reports_router)
