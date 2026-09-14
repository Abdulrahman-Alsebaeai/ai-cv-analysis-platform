import uuid

import numpy as np
from datetime import datetime
from threading import Lock

from app.services.supabase_db import get_supabase_admin
from app.ai.model_loader import load_e5_model
from app.ai.embedder import format_query, format_passage, l2_normalize
from app.ai.text_extractors import extract_text_by_file
from app.ai.parsing import parse_resume_smart
from app.ai.scorer import compute_requirements_score, final_score, build_explanation
from app.ai.jd_parser import parse_job_description_to_requirements
from app.ai.stuffing import analyze_keyword_stuffing
from app.ai.chunking import split_into_chunks
from app.ai.domain_lexicon import compute_local_cv_similarity, expand_text_with_aliases

_MODEL = None
_MODEL_LOCK = Lock()


def get_model():
    global _MODEL
    if _MODEL is None:
        with _MODEL_LOCK:
            if _MODEL is None:
                _MODEL = load_e5_model()
    return _MODEL


def _to_pgvector_str(vec: list[float]) -> str:
    return "[" + ",".join(f"{x:.8f}" for x in vec) + "]"


def _now():
    return datetime.utcnow().isoformat()


def _map_status_to_new(s: str | None) -> str:
    s = (s or "").lower().strip()
    if s in ("uploaded", "queued", ""):
        return "queued"
    if s in ("analyzing", "processing"):
        return "processing"
    if s in ("analyzed", "done"):
        return "done"
    if s in ("failed", "error"):
        return "failed"
    return s


def _blend_similarity(vector_similarity: float, local_match: dict) -> float:
    """Protect obvious bilingual/domain matches from weak offline embeddings.

    Supabase vector similarity remains the baseline, but the deterministic local score can lift
    cases like English "Dentist" vs Arabic "طبيب أسنان" where the old score could be ~0.11.
    """
    vector_similarity = max(0.0, min(1.0, float(vector_similarity or 0.0)))
    local_score = max(0.0, min(1.0, float((local_match or {}).get("score") or 0.0)))
    if local_match.get("exact_role_match"):
        return max(vector_similarity, local_score)
    return max(vector_similarity, (0.65 * vector_similarity) + (0.35 * local_score), local_score * 0.88)


class ScoringService:
    def __init__(self):
        self.sb = get_supabase_admin()

    # ---------- JD parsing + requirement generation ----------
    def suggest_requirements_from_job(self, job_id: str) -> dict:
        job = self.sb.table("jobs").select("id,title,description").eq("id", job_id).single().execute().data
        if not job:
            raise RuntimeError("Job not found")

        parsed = parse_job_description_to_requirements(job.get("title") or "", job.get("description") or "")
        self.sb.table("jobs").update({"jd_parsed_json": parsed}).eq("id", job_id).execute()
        return parsed

    def generate_requirements_for_job(self, job_id: str) -> dict:
        parsed = self.suggest_requirements_from_job(job_id)
        reqs = parsed.get("requirements") or []

        self.sb.table("job_requirements").delete().eq("job_id", job_id).eq("source", "auto").execute()

        if reqs:
            rows = []
            for r in reqs:
                rows.append({
                    "id": str(uuid.uuid4()),
                    "job_id": job_id,
                    "req_type": r["req_type"],
                    "req_value": r["req_value"],
                    "weight": r.get("weight", 1.0),
                    "must_have": r.get("must_have", False),
                    "source": "auto",
                })
            self.sb.table("job_requirements").insert(rows).execute()

        self.sb.table("jobs").update({"requirements_generated_at": _now()}).eq("id", job_id).execute()
        return {"job_id": job_id, "generated": len(reqs)}

    # ---------- Job Embedding ----------
    def ensure_job_embedding(self, job_id: str, force: bool = False):
        if force:
            self.sb.table("job_embeddings").delete().eq("job_id", job_id).execute()
        else:
            exists = self.sb.table("job_embeddings").select("job_id").eq("job_id", job_id).execute().data
            if exists:
                return

        job = self.sb.table("jobs").select("id,title,description").eq("id", job_id).single().execute().data
        if not job:
            raise RuntimeError("Job not found")

        reqs = self.sb.table("job_requirements").select("req_type,req_value,must_have,weight").eq("job_id", job_id).execute().data or []
        req_text = "\n".join([f"{'MUST' if r['must_have'] else 'NICE'} | {r['req_type']}: {r['req_value']} (w={r['weight']})" for r in reqs])
        job_text = f"{job['title']}\n\n{job['description']}\n\nRequirements:\n{req_text}"
        job_text = expand_text_with_aliases(job_text)

        model = get_model()
        emb = model.encode([format_query(job_text)], normalize_embeddings=True)[0]
        emb = l2_normalize(emb.astype(np.float32))

        self.sb.table("job_embeddings").upsert({
            "job_id": job_id,
            "embedding": _to_pgvector_str(emb.tolist()),
            "updated_at": _now(),
        }).execute()

    # ---------- Candidate Resume Embedding + Parse ----------
    def ensure_candidate_resume_embedding_and_parse(self, candidate_resume_id: str, force: bool = False):
        if force:
            self.sb.table("candidate_resume_embeddings").delete().eq("resume_id", candidate_resume_id).execute()
        else:
            exists = self.sb.table("candidate_resume_embeddings").select("resume_id").eq("resume_id", candidate_resume_id).execute().data
            if exists:
                return

        cr = self.sb.table("candidate_resumes").select("id,storage_path,file_name,mime_type").eq("id", candidate_resume_id).single().execute().data
        if not cr:
            raise RuntimeError("Candidate resume not found")
        if not cr.get("storage_path"):
            raise RuntimeError("Candidate resume missing storage_path")

        data = self.sb.storage.from_("resumes").download(cr["storage_path"])
        text = extract_text_by_file(data, cr.get("mime_type") or "", cr.get("file_name") or "")
        parsed = parse_resume_smart(text)

        self.sb.table("candidate_resumes").update({
            "text_extracted": text,
            "parsed_json": parsed,
        }).eq("id", candidate_resume_id).execute()

        embed_text = expand_text_with_aliases(text + "\n" + " ".join(str(x) for x in parsed.get("skills", []) or []))
        model = get_model()
        emb = model.encode([format_passage(embed_text)], normalize_embeddings=True)[0]
        emb = l2_normalize(emb.astype(np.float32))

        self.sb.table("candidate_resume_embeddings").upsert({
            "resume_id": candidate_resume_id,
            "embedding": _to_pgvector_str(emb.tolist()),
            "updated_at": _now(),
        }).execute()

    # ---------- Analyze Candidate Resume ----------
    
    def analyze_candidate_resume(self, candidate_resume_id: str) -> dict:
        cr = self.sb.table("candidate_resumes").select("id,job_id,status,stage,file_name").eq("id", candidate_resume_id).single().execute().data
        if not cr:
            raise RuntimeError("Candidate resume not found")

        current_stage = (cr.get("stage") or "").lower().strip()
        self.sb.table("candidate_resumes").update({"status": "processing", "last_error": None}).eq("id", candidate_resume_id).execute()

        try:
            job_id = cr["job_id"]

            self.ensure_job_embedding(job_id, force=True)
            self.ensure_candidate_resume_embedding_and_parse(candidate_resume_id, force=True)

            job = self.sb.table("jobs").select("id,title,description").eq("id", job_id).single().execute().data or {}

            sim_res = self.sb.rpc("compute_similarity_candidate", {"p_job_id": job_id, "p_candidate_resume_id": candidate_resume_id}).execute().data
            if not sim_res:
                raise RuntimeError("Candidate similarity compute failed")

            distance = float(sim_res[0]["distance"])
            vector_similarity = max(0.0, min(1.0, float(sim_res[0]["similarity"])))

            reqs = self.sb.table("job_requirements").select("req_type,req_value,weight,must_have,source").eq("job_id", job_id).execute().data or []

            cr_full = self.sb.table("candidate_resumes").select("text_extracted,parsed_json,file_name").eq("id", candidate_resume_id).single().execute().data
            resume_text = ((cr_full.get("text_extracted") or "") + "\n" + (cr_full.get("file_name") or cr.get("file_name") or ""))
            parsed = (cr_full.get("parsed_json") or {})

            local_match = compute_local_cv_similarity(
                job_title=job.get("title") or "",
                job_description=job.get("description") or "",
                requirements=reqs,
                resume_text=resume_text,
                parsed_resume=parsed,
            )
            similarity = _blend_similarity(vector_similarity, local_match)

            # --- Build chunks + embeddings (for per-requirement evidence) ---
            chunks = split_into_chunks(expand_text_with_aliases(resume_text))
            model = get_model()
            chunk_embs = None
            if chunks:
                try:
                    emb_mat = model.encode([format_passage(c) for c in chunks], normalize_embeddings=True)
                    emb_mat = np.asarray(emb_mat, dtype=np.float32)
                    norms = np.linalg.norm(emb_mat, axis=1, keepdims=True)
                    norms[norms == 0] = 1.0
                    chunk_embs = emb_mat / norms
                except Exception:
                    chunk_embs = None

            def query_embedder(q: str):
                try:
                    v = model.encode([format_query(expand_text_with_aliases(q))], normalize_embeddings=True)[0]
                    v = np.asarray(v, dtype=np.float32)
                    n = np.linalg.norm(v)
                    return v if n == 0 else (v / n)
                except Exception:
                    return None

            rerank_fn = None
            try:
                from app.ai.reranker import rerank as _rerank
                rerank_fn = _rerank
            except Exception:
                rerank_fn = None

            req_break = compute_requirements_score(
                reqs,
                resume_text,
                parsed,
                chunks=chunks,
                chunk_embs=chunk_embs,
                query_embedder=query_embedder,
                rerank_fn=rerank_fn,
                semantic_threshold=0.56,
            )
            req_score = float(req_break["requirements_score"])

            raw = float(final_score(similarity, req_score))

            stuffing = analyze_keyword_stuffing(resume_text, reqs, parsed_entities=parsed)
            penalty = float(stuffing.get("penalty") or 0.0)
            final = max(0.0, raw * (1.0 - penalty))

            explanation = build_explanation(similarity, req_break)
            explanation += f" | Vector similarity={vector_similarity:.3f} | Local domain match={float(local_match.get('score') or 0):.3f}"
            if stuffing.get("is_suspected"):
                explanation += f" | Keyword stuffing suspected (penalty={penalty:.3f})"

            breakdown = {
                "similarity": similarity,
                "semantic_similarity": similarity,
                "vector_similarity": vector_similarity,
                "local_domain_match": local_match,
                "distance": distance,
                "requirements": req_break,
                "raw_score": raw,
                "penalty": penalty,
                "final_score": final,
                "warnings": stuffing,
                "explanation": explanation,
                "candidate_resume_id": candidate_resume_id,
                "resume_entities": parsed,
            }

            self.sb.table("candidate_scores").upsert({
                "candidate_resume_id": candidate_resume_id,
                "raw_score": raw,
                "penalty": penalty,
                "final_score": final,
                "warnings": stuffing,
                "breakdown": breakdown,
                "updated_at": _now(),
            }).execute()

            update_payload = {"status": "done", "last_error": None}
            if current_stage in ("", "submitted"):
                update_payload["stage"] = "analyzed"

            self.sb.table("candidate_resumes").update(update_payload).eq("id", candidate_resume_id).execute()

            return {
                "candidate_resume_id": candidate_resume_id,
                "final_score": final,
                "raw_score": raw,
                "penalty": penalty,
                "similarity": similarity,
                "vector_similarity": vector_similarity,
                "local_domain_match": local_match,
            }

        except Exception as e:
            self.sb.table("candidate_resumes").update({"status": "failed", "last_error": str(e)}).eq("id", candidate_resume_id).execute()
            raise

    def analyze_job_candidates(self, job_id: str) -> dict:
        rows = self.sb.table("candidate_resumes").select("id,status").eq("job_id", job_id).execute().data or []
        analyzed = 0
        errors = []

        for r in rows:
            try:
                self.analyze_candidate_resume(r["id"])
                analyzed += 1
            except Exception as e:
                errors.append({"candidate_resume_id": r.get("id"), "error": str(e)})

        return {"job_id": job_id, "analyzed": analyzed, "skipped": 0, "errors": errors}
