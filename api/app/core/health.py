from __future__ import annotations
from fastapi import APIRouter
from app.services.supabase_client import get_supabase
router = APIRouter(prefix="/health", tags=["health"])
@router.get("")
def health(): return {"status":"ok"}
@router.get("/supabase")
def health_supabase():
    try:
        sb=get_supabase(); res=sb.table("jobs").select("id").limit(1).execute(); return {"status":"ok","jobs_table_ok":True,"sample_count":len(res.data or [])}
    except Exception as exc:
        return {"status":"degraded","jobs_table_ok":False,"error":str(exc)}
@router.get("/rpc")
def health_rpc():
    try:
        sb=get_supabase(); sb.table("jobs").select("id").limit(1).execute(); return {"status":"ok","note":"Basic connectivity ok. Verify compute_similarity_candidate via migrations."}
    except Exception as exc:
        return {"status":"degraded","error":str(exc)}
