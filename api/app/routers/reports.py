from fastapi import APIRouter, Body, Depends
from fastapi.responses import Response
from app.core.auth import require_api_key
from app.services.pdf_report import render_job_report
router = APIRouter(prefix='/reports', tags=['reports'])
@router.post('/render-pdf')
def render_pdf(payload=Body(...), _:None = Depends(require_api_key)):
    return Response(content=render_job_report(payload), media_type='application/pdf')
