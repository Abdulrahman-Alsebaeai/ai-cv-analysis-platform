import re
from datetime import date
from typing import Any, Dict, List

from app.ai.skill_lexicon import extract_skills_from_text
try:
    from app.ai.domain_lexicon import extract_domain_terms, normalize_text
except Exception:  # pragma: no cover
    def extract_domain_terms(text: str, categories=None): return []
    def normalize_text(text: str) -> str: return re.sub(r"\s+", " ", (text or "").strip().lower())


def _norm(s: str) -> str:
    return normalize_text(s)


def _unique(xs: List[str]) -> List[str]:
    seen = set()
    out = []
    for x in xs:
        k = _norm(x)
        if not k or k in seen:
            continue
        seen.add(k)
        out.append(str(x).strip())
    return out


def extract_skills(text: str) -> List[str]:
    skills = extract_skills_from_text(text)
    skills += extract_domain_terms(text)
    return _unique(skills)


def extract_languages(text: str) -> List[str]:
    t = _norm(text)
    langs = []
    aliases = {
        "english": ["english", "الانجليزيه", "الانجليزية", "انجليزي", "انجليزية"],
        "arabic": ["arabic", "العربيه", "العربية", "عربي", "عربية"],
        "french": ["french", "فرنسي", "فرنسية", "فرنسيه"],
        "german": ["german", "ألماني", "الماني", "ألمانية", "المانيه"],
        "spanish": ["spanish", "اسباني", "اسبانية", "اسبانيه"],
        "urdu": ["urdu", "اردو"],
        "hindi": ["hindi", "هندي"],
    }
    for canonical, vals in aliases.items():
        if any(_norm(v) in t for v in vals):
            langs.append(canonical)
    return sorted(set(langs))


def extract_education(text: str) -> List[str]:
    t = _norm(text)
    degrees = []
    if any(k in t for k in ["phd", "doctorate", "دكتوراه"]): degrees.append("phd")
    if any(k in t for k in ["master", "msc", "m.sc", "ماجستير"]): degrees.append("master")
    if any(k in t for k in ["bachelor", "bsc", "b.sc", "bs", "بكالوريوس", "ليسانس"]): degrees.append("bachelor")
    if any(k in t for k in ["diploma", "دبلوم"]): degrees.append("diploma")
    return _unique(degrees)


def extract_years(text: str) -> float:
    t = text or ""
    nums: List[int] = []
    for m in re.finditer(r"(\d{1,2})\s*\+?\s*(?:years|yrs|year|سنوات|سنة|سنه)", t, flags=re.I):
        try: nums.append(int(m.group(1)))
        except Exception: pass

    # infer from date ranges: 2019-2024, 2019 – present, ٢٠١٩ - الآن is intentionally handled for Western digits after PDF extraction.
    current = date.today().year
    for m in re.finditer(r"\b(20\d{2}|19\d{2})\b\s*(?:-|–|—|to|حتى|الى|إلى)\s*(present|current|now|الان|الآن|20\d{2}|19\d{2})", t, flags=re.I):
        try:
            start = int(m.group(1))
            raw_end = m.group(2).lower()
            end = current if raw_end in {"present", "current", "now", "الان", "الآن"} else int(raw_end)
            if 0 <= end - start <= 60:
                nums.append(end - start)
        except Exception:
            pass
    return float(max(nums)) if nums else 0.0


def extract_certs(text: str) -> List[str]:
    t = _norm(text)
    certs = []
    for c in [
        "pmp", "aws certified", "azure", "gcp", "ccna", "cissp", "ceh", "scrum", "itil", "security+", "comptia",
        "dental license", "license dentist", "bds", "dds", "dmd", "ترخيص مزاولة", "رخصة مزاولة", "بكالوريوس طب الاسنان",
    ]:
        if _norm(c) in t:
            certs.append(c)
    return _unique(certs)


def parse_resume(text: str) -> Dict[str, Any]:
    t = text or ""
    return {
        "skills": extract_skills(t),
        "languages": extract_languages(t),
        "education": extract_education(t),
        "certs": extract_certs(t),
        "total_years": extract_years(t),
        "roles": extract_domain_terms(t, categories=["role"]),
    }


def _merge_parsed(primary: Dict[str, Any], fallback: Dict[str, Any]) -> Dict[str, Any]:
    out = dict(primary or {})
    for key in ("skills", "languages", "education", "certs", "roles"):
        out[key] = _unique([*(out.get(key) or []), *(fallback.get(key) or [])])
    try:
        out["total_years"] = max(float(out.get("total_years") or 0.0), float(fallback.get("total_years") or 0.0))
    except Exception:
        out["total_years"] = fallback.get("total_years", 0.0)
    out.setdefault("experience", [])
    return out


def parse_resume_smart(text: str) -> Dict[str, Any]:
    fallback = parse_resume(text)

    try:
        from app.ai.llm_resume_parser import parse_resume_with_gemini
        parsed = parse_resume_with_gemini(text)
        if isinstance(parsed, dict) and parsed:
            return _merge_parsed(parsed, fallback)
    except Exception:
        pass

    try:
        from app.ai.llm_resume_parser import parse_resume_with_openai
        parsed = parse_resume_with_openai(text)
        if isinstance(parsed, dict) and parsed:
            return _merge_parsed(parsed, fallback)
    except Exception:
        pass

    return fallback
