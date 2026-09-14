import re
from typing import Any, Dict, List

from app.ai.skill_lexicon import contains_skill, extract_skills_from_text
try:
    from app.ai.domain_lexicon import extract_domain_terms, normalize_text
except Exception:  # pragma: no cover
    def extract_domain_terms(text: str, categories=None): return []
    def normalize_text(text: str) -> str: return re.sub(r"\s+", " ", (text or "").strip().lower())

DEGREE_KEYWORDS = [
    ("phd", ["phd", "doctorate", "دكتوراه"]),
    ("master", ["master", "msc", "m.sc", "ماجستير"]),
    ("bachelor", ["bachelor", "bsc", "b.sc", "bs", "bds", "dds", "dmd", "بكالوريوس", "بكالوريوس طب الاسنان"]),
    ("diploma", ["diploma", "دبلوم"]),
]
LANG_KEYWORDS = ["english", "arabic", "french", "german", "spanish", "urdu", "hindi", "الانجليزية", "العربية", "فرنسية", "ألمانية", "اسبانية"]
CERT_KEYWORDS = ["pmp", "aws certified", "azure", "gcp", "ccna", "cissp", "ceh", "scrum", "itil", "comptia", "security+", "dental license", "ترخيص مزاولة", "رخصة مزاولة"]


def _norm(s: str) -> str:
    return normalize_text(s)


def _split_lines(text: str) -> List[str]:
    return [re.sub(r"^\s*[-•\u2022]+\s*", "", l).strip() for l in (text or "").replace("\r", "\n").split("\n") if l.strip()]


def _extract_years(text: str) -> List[int]:
    nums = []
    for m in re.finditer(r"(\d{1,2})\s*\+?\s*(?:years|yrs|year|سنوات|سنة|سنه)", text, flags=re.I):
        try: nums.append(int(m.group(1)))
        except Exception: pass
    return nums


def _extract_degrees(text: str) -> List[str]:
    t = _norm(text)
    return [deg for deg, keys in DEGREE_KEYWORDS if any(_norm(k) in t for k in keys)]


def _extract_languages(text: str) -> List[str]:
    t = _norm(text)
    out = []
    for lang in LANG_KEYWORDS:
        if _norm(lang) in t: out.append(_norm(lang))
    norm_map = {"الانجليزية": "english", "العربية": "arabic", "فرنسية": "french", "ألمانية": "german", "اسبانية": "spanish"}
    return sorted({norm_map.get(x, x) for x in out})


def _extract_certs(text: str) -> List[str]:
    t = _norm(text)
    return sorted({_norm(c) for c in CERT_KEYWORDS if _norm(c) in t})


def _extract_skills(text: str) -> List[str]:
    skills = extract_skills_from_text(text)
    skills += extract_domain_terms(text)
    # For title-only jobs, make sure professional roles become requirements.
    skills += extract_domain_terms(text, categories=["role"])
    seen = set(); out = []
    for s in skills:
        k = _norm(s)
        if k and k not in seen:
            seen.add(k); out.append(s)
    return out


def parse_job_description_to_requirements(title: str, description: str) -> Dict[str, Any]:
    full = f"{title or ''}\n{description or ''}"
    lines = _split_lines(full)
    years = _extract_years(full)
    degrees = _extract_degrees(full)
    langs = _extract_languages(full)
    certs = _extract_certs(full)
    skills = _extract_skills(full)
    roles = extract_domain_terms(full, categories=["role"])
    must_hints = ["must", "required", "requirements", "mandatory", "essential", "الزامي", "إلزامي", "يشترط", "متطلب", "مطلوب"]
    nice_hints = ["preferred", "nice to have", "plus", "bonus", "ميزة", "يفضل", "مفضل"]
    reqs: List[Dict[str, Any]] = []

    def add(req_type: str, value: str, must: bool, weight: float):
        value = (value or "").strip()
        if value:
            reqs.append({"req_type": req_type, "req_value": value, "must_have": bool(must), "weight": float(weight), "source": "auto"})

    if years:
        add("years", str(max(years)), True, 2.0)
    if degrees:
        order = {"phd": 4, "master": 3, "bachelor": 2, "diploma": 1}
        top = sorted(degrees, key=lambda d: order.get(d, 0), reverse=True)[0]
        add("education", top, False, 1.2)
    for l in langs:
        add("language", l, False, 0.8)
    for c in certs[:8]:
        add("cert", c, False, 0.8 if "license" in c or "ترخيص" in c or "رخصة" in c else 0.6)

    for role in roles:
        # A title like "Dentist" is a core must-have, not a weak keyword.
        add("skill", role, True, 2.0)

    for s in skills[:40]:
        must = False
        nice = False
        for line in lines:
            nl = _norm(line)
            if contains_skill(nl, s) or _norm(s) in nl:
                if any(_norm(h) in nl for h in must_hints): must = True
                if any(_norm(h) in nl for h in nice_hints): nice = True
        add("skill", s, must, 1.6 if must else 1.2 if nice else 1.0)

    tokens = [t for t in re.split(r"[^\u0600-\u06ffa-zA-Z0-9\+\.#]+", (title or "")) if len(t) >= 3]
    for t in tokens[:8]:
        add("keyword", t.lower(), False, 0.45)

    seen = set(); dedup = []
    for r in reqs:
        key = (r["req_type"], _norm(r["req_value"]))
        if key in seen: continue
        seen.add(key); dedup.append(r)
    return {"requirements": dedup, "signals": {"years": years, "degrees": degrees, "languages": langs, "certs": certs, "skills": skills, "roles": roles}}
