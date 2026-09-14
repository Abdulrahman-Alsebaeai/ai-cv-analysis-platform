from fastapi import APIRouter, Depends
from app.core.auth import require_api_key
from app.services.scoring_service import ScoringService
router = APIRouter(prefix="/analysis", tags=["analysis"])
@router.get('/health')
def health(): return {"ok":True}
@router.post('/jobs/{job_id}/requirements/suggest')
def suggest_reqs(job_id:str, _:None = Depends(require_api_key)): return ScoringService().suggest_requirements_from_job(job_id)
@router.post('/jobs/{job_id}/requirements/generate')
def generate_reqs(job_id:str, _:None = Depends(require_api_key)): return ScoringService().generate_requirements_for_job(job_id)
@router.post('/candidate-resumes/{candidate_resume_id}/analyze')
def analyze_candidate_resume(candidate_resume_id:str, _:None = Depends(require_api_key)): return ScoringService().analyze_candidate_resume(candidate_resume_id)
@router.post('/jobs/{job_id}/analyze-candidates')
def analyze_job_candidates(job_id:str, _:None = Depends(require_api_key)): return ScoringService().analyze_job_candidates(job_id)
