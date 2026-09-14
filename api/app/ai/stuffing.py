import re
from typing import Any, Dict, List

CTX_HINTS = [
    "project", "projects", "experience", "worked", "built", "developed", "implemented", "designed", "led",
    "responsibilities", "role", "achievement", "accomplished",
    "مشروع", "خبرة", "عملت", "طورت", "نفذت", "صممت", "قدت", "مسؤوليات", "انجاز",
]


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def _word_count(text: str) -> int:
    return len(re.findall(r"\b\w+\b", text or ""))


def _count_term(text: str, term: str) -> int:
    t = text or ""
    term = term.strip()
    if not term:
        return 0
    if " " in term or "." in term or "+" in term or "#" in term:
        return len(re.findall(re.escape(term), t, flags=re.I))
    return len(re.findall(rf"\b{re.escape(term)}\b", t, flags=re.I))


def _context_hits(text: str, term: str) -> int:
    lines = (text or "").splitlines()
    hits = 0
    for ln in lines:
        if re.search(re.escape(term), ln, flags=re.I):
            n = _norm(ln)
            if any(h in n for h in CTX_HINTS):
                hits += 1
    return hits


def _bi(ar: str, en: str) -> str:
    return f"{en} | {ar}"


def analyze_keyword_stuffing(
    resume_text: str,
    requirements: List[Dict[str, Any]],
    parsed_entities: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    text = resume_text or ""
    wc = _word_count(text)
    if wc < 120:
        return {
            "is_suspected": False,
            "stuffing_score": 0.0,
            "penalty": 0.0,
            "keyword_density": 0.0,
            "repeated_terms": [],
            "reasons": [],
            "word_count": wc,
        }

    terms: List[str] = []
    for r in requirements or []:
        tp = str(r.get("req_type") or "").lower().strip()
        if tp in ("skill", "keyword", "cert", "language"):
            v = str(r.get("req_value") or "").strip()
            if v:
                terms.append(v)

    if parsed_entities:
        for s in (parsed_entities.get("skills") or [])[:30]:
            terms.append(str(s))

    seen = set()
    uniq = []
    for t in terms:
        k = _norm(t)
        if not k or k in seen:
            continue
        seen.add(k)
        uniq.append(t)

    total_hits = 0
    repeated_terms = []
    for term in uniq:
        c = _count_term(text, term)
        if c <= 0:
            continue
        total_hits += c
        dens_1000 = (c / wc) * 1000.0
        ctx = _context_hits(text, term)

        if c >= 14 or dens_1000 >= 18:
            repeated_terms.append({
                "term": term,
                "count": c,
                "density_per_1000": round(dens_1000, 2),
                "context_hits": ctx,
            })

    keyword_density = total_hits / max(1, wc)

    reasons = []
    if keyword_density >= 0.14:
        reasons.append(_bi(f"كثافة كلمات مفتاحية مرتفعة ({keyword_density:.2%})", f"High keyword density ({keyword_density:.2%})"))

    if len(repeated_terms) >= 2:
        reasons.append(_bi(f"توجد عدة مصطلحات مكررة ({len(repeated_terms)})", f"Multiple repeated terms ({len(repeated_terms)})"))

    low_context = [t for t in repeated_terms if int(t["context_hits"]) <= 1 and int(t["count"]) >= 16]
    if low_context:
        reasons.append(_bi("المصطلحات المكررة تظهر مع سياق خبرة أو مشاريع ضعيف", "Repeated terms appear with weak project or experience context"))

    score = 0.0
    score += min(0.6, max(0.0, (keyword_density - 0.10) * 6.0))
    score += min(0.3, 0.08 * len(repeated_terms))
    score += 0.2 if low_context else 0.0
    score = max(0.0, min(1.0, score))

    suspected = score >= 0.45 and (keyword_density >= 0.11 or len(repeated_terms) >= 2)

    penalty = 0.0
    if suspected:
        penalty = 0.08 + 0.18 * score
        penalty = min(0.30, max(0.05, penalty))

    return {
        "is_suspected": suspected,
        "stuffing_score": round(score, 3),
        "penalty": round(penalty, 3),
        "keyword_density": round(keyword_density, 4),
        "repeated_terms": sorted(repeated_terms, key=lambda x: x["count"], reverse=True)[:10],
        "reasons": reasons,
        "word_count": wc,
        "total_keyword_hits": total_hits,
    }
