from __future__ import annotations

import re
import unicodedata
from datetime import date
from functools import lru_cache
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

_ARABIC_TRANSLATION = str.maketrans({
    "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا",
    "ى": "ي", "ئ": "ي", "ؤ": "و", "ة": "ه",
    "ـ": "", "َ": "", "ً": "", "ُ": "", "ٌ": "", "ِ": "", "ٍ": "", "ْ": "", "ّ": "",
})

_ARABIC_DIGITS = str.maketrans({
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
    "٥": "5", "٦": "6", "٧": "8", "٨": "8", "٩": "9",
    "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
    "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
})

# Fix a typo in the table above for Arabic-Indic ٧.
_ARABIC_DIGITS = str.maketrans({
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
    "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
    "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
    "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
})

STOPWORDS = {
    "and", "or", "the", "a", "an", "to", "for", "of", "in", "on", "with", "from", "by", "at", "as", "is", "are", "be",
    "job", "role", "position", "required", "requirement", "requirements", "preferred", "candidate", "applicant", "cv", "resume",
    "must", "have", "must-have", "nice", "plus", "ability", "responsible", "responsibilities", "work", "working", "team", "company",
    "و", "او", "أو", "في", "من", "على", "مع", "عن", "الى", "إلى", "ال", "هذا", "هذه", "ذلك", "تلك", "لدي", "لديه", "لديها",
    "مطلوب", "مطلوبه", "مطلوبة", "وظيفه", "وظيفة", "دور", "منصب", "خبره", "خبرة", "سنوات", "سنه", "سنة", "مرشح", "متقدم",
    "العمل", "شركة", "الشركة", "فريق", "مسؤول", "مسؤولة", "مهام", "مسؤوليات", "قدرة", "القدرة", "يفضل", "اساسي", "أساسي",
}

ALIAS_GROUPS: Dict[str, tuple[str, ...]] = {
    "real_estate_agent": ("real estate agent", "realtor", "property agent", "real estate broker", "property broker", "real estate sales agent", "وكيل عقاري", "وسيط عقاري", "مسوق عقاري", "مندوب عقاري", "خبير عقاري", "سمسار عقاري"),
    "property_consultant": ("property consultant", "real estate consultant", "real estate advisor", "property advisor", "مستشار عقاري", "استشاري عقاري", "استشارات عقارية", "مستشار املاك", "مستشار أملاك"),
    "real_estate": ("real estate", "property", "properties", "عقار", "عقاري", "العقارات", "عقارات", "املاك", "أملاك"),
    "real_estate_sales": ("real estate sales", "property sales", "selling properties", "بيع العقارات", "مبيعات عقارية", "البيع العقاري", "عمليات البيع"),
    "property_purchase": ("property purchase", "buying properties", "real estate purchase", "شراء العقارات", "عمليات الشراء", "الشراء العقاري"),
    "property_leasing": ("property leasing", "property rental", "real estate leasing", "renting properties", "تأجير العقارات", "تاجير العقارات", "ايجار العقارات", "التأجير العقاري"),
    "real_estate_marketing": ("real estate marketing", "property marketing", "digital real estate marketing", "التسويق العقاري", "استراتيجيات التسويق العقاري", "التسويق الرقمي"),
    "property_valuation": ("property valuation", "real estate valuation", "property appraisal", "تقييم العقارات", "تقيم العقارات", "تثمين العقارات", "تقييم عقاري"),
    "real_estate_market_analysis": ("real estate market analysis", "market analysis", "real estate trends", "تحليل السوق العقاري", "تحليل السوق", "تحليل الاتجاهات السوقية", "ديناميكات سوق العقارات", "سوق العقارات"),
    "developer_coordination": ("coordination with developers", "real estate developers", "brokers and developers", "التنسيق مع الوكلاء", "التنسيق مع المطورين", "المطورين العقاريين", "الوكلاء والمطورين"),
    "dentist": ("dentist", "dental doctor", "dental surgeon", "general dentist", "dentistry", "طب اسنان", "طب الاسنان", "طبيب اسنان", "طبيب أسنان", "طبيبة اسنان", "دكتور اسنان"),
    "dental_assistant": ("dental assistant", "dental nurse", "مساعد طبيب اسنان", "مساعد اسنان", "مساعدة طبيب اسنان", "مساعدة اسنان"),
    "orthodontics": ("orthodontist", "orthodontics", "تقويم الاسنان", "اخصائي تقويم", "أخصائي تقويم"),
    "endodontics": ("endodontics", "root canal", "root canal treatment", "علاج العصب", "حشو العصب", "معالجة الجذور"),
    "oral_surgery": ("oral surgery", "tooth extraction", "extractions", "surgical extraction", "جراحة الفم", "خلع الاسنان", "خلع سن", "خلع ضرس"),
    "dental_implants": ("dental implants", "implantology", "implants", "زراعة الاسنان", "زرعات الاسنان"),
    "patient_care": ("patient care", "clinical care", "patient management", "رعاية المرضى", "التعامل مع المرضى", "خدمة المرضى"),
    "infection_control": ("infection control", "sterilization", "cross infection", "مكافحة العدوى", "التعقيم", "تعقيم الادوات"),
    "doctor": ("doctor", "physician", "medical doctor", "طبيب", "طبيبه", "طبيبة", "دكتور", "دكتوره", "دكتورة"),
    "nurse": ("nurse", "registered nurse", "nursing", "ممرض", "ممرضة", "تمريض"),
    "pharmacist": ("pharmacist", "pharmacy", "صيدلي", "صيدلاني", "صيدلة", "صيدله"),
    "sales": ("sales", "sales representative", "sales executive", "sales specialist", "مندوب مبيعات", "مبيعات", "مسؤول مبيعات", "اخصائي مبيعات"),
    "marketing": ("marketing", "digital marketing", "marketer", "marketing specialist", "تسويق", "مسوق", "تسويق رقمي", "اخصائي تسويق"),
    "customer_service": ("customer service", "customer support", "call center", "خدمة العملاء", "دعم العملاء", "كول سنتر", "عناية العملاء"),
    "human_resources": ("human resources", "hr", "recruiter", "talent acquisition", "موارد بشرية", "الموارد البشرية", "توظيف", "استقطاب المواهب"),
    "accountant": ("accountant", "accounting", "general accountant", "محاسب", "محاسبة", "محاسبه", "الحسابات", "محاسب عام"),
    "business_administration": ("business administration", "business management", "bba", "ادارة الاعمال", "إدارة الأعمال", "ادارة اعمال", "كلية ادارة الاعمال"),
    "teacher": ("teacher", "teaching", "instructor", "tutor", "مدرس", "مدرسة", "معلم", "معلمة", "تعليم", "تدريس", "مدرب"),
    "project_manager": ("project manager", "project management", "pmp", "scrum master", "مدير مشروع", "ادارة مشاريع", "إدارة مشاريع"),
    "administrative_assistant": ("administrative assistant", "admin assistant", "office administrator", "secretary", "مساعد اداري", "اداري", "ادارية", "سكرتير", "سكرتيرة"),
    "software_engineer": ("software engineer", "software developer", "programmer", "developer", "backend developer", "frontend developer", "full stack", "مبرمج", "مهندس برمجيات", "مطور برمجيات", "مطور ويب"),
    "data_analyst": ("data analyst", "business intelligence", "bi analyst", "محلل بيانات", "تحليل بيانات", "ذكاء الاعمال"),
    "cybersecurity": ("cybersecurity", "security analyst", "information security", "soc analyst", "امن سيبراني", "الأمن السيبراني", "امن المعلومات", "محلل امن"),
    "it_support": ("it support", "technical support", "help desk", "دعم فني", "تقنية معلومات", "فني حاسب"),
    "ui_ux": ("ui ux", "ui/ux", "ux designer", "ui designer", "مصمم واجهات", "تجربة المستخدم", "واجهة المستخدم"),
    "civil_engineer": ("civil engineer", "civil engineering", "site engineer", "مهندس مدني", "هندسة مدنية", "مهندس موقع"),
    "architect": ("architect", "architecture", "architectural engineer", "مهندس معماري", "معماري", "هندسة معمارية"),
    "mechanical_engineer": ("mechanical engineer", "mechanical engineering", "مهندس ميكانيكي", "هندسة ميكانيكية"),
    "electrical_engineer": ("electrical engineer", "electrical engineering", "مهندس كهرباء", "هندسة كهربائية"),
    "negotiation": ("negotiation", "deal negotiation", "client negotiation", "التفاوض", "مهارات التفاوض", "التفاوض مع العملاء", "تحقيق أفضل الصفقات"),
    "communication": ("communication", "customer communication", "client communication", "interpersonal skills", "مهارات التواصل", "التواصل", "التواصل مع العملاء", "التعامل مع العملاء"),
    "leadership": ("leadership", "team leadership", "supervision", "management", "قيادة", "قيادة فريق", "اشراف", "إشراف", "ادارة فريق"),
    "problem_solving": ("problem solving", "analytical thinking", "critical thinking", "حل المشكلات", "حل المشاكل", "تفكير تحليلي"),
    "english_language": ("english", "english language", "fluent english", "advanced english", "اللغة الانجليزية", "اللغة الإنجليزية", "انجليزي", "إنجليزي", "متقدم"),
    "arabic_language": ("arabic", "arabic language", "native arabic", "اللغة العربية", "عربي", "العربية", "اللغة الام"),
}

ROLE_GROUPS = {
    "real_estate_agent", "property_consultant", "dentist", "dental_assistant", "doctor", "nurse", "pharmacist",
    "sales", "marketing", "customer_service", "human_resources", "accountant", "teacher", "project_manager",
    "software_engineer", "data_analyst", "cybersecurity", "it_support", "ui_ux", "civil_engineer", "architect",
    "mechanical_engineer", "electrical_engineer", "administrative_assistant",
}

def normalize_text(text: str) -> str:
    text = unicodedata.normalize("NFKC", text or "")
    text = text.translate(_ARABIC_DIGITS).translate(_ARABIC_TRANSLATION).lower()
    text = re.sub(r"[\u064b-\u065f]", "", text)
    text = re.sub(r"[^\u0600-\u06ffa-z0-9_+#./\- ]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def _norm(s: str) -> str:
    return normalize_text(s or "")

def _word_re(s: str) -> str:
    return rf"(?<![\w+#./-]){re.escape(_norm(s))}(?![\w+#./-])"

def _tokens(text: str) -> List[str]:
    return [
        t for t in re.findall(r"[\u0600-\u06ffa-z0-9_+#./\-]{2,}", _norm(text))
        if t not in STOPWORDS and not t.isdigit()
    ]

def _token_set(text: str) -> set[str]:
    return set(_tokens(text))

def _split_alternatives(text: str) -> List[str]:
    text = text or ""
    pieces = re.split(r"\s*(?:/|\||،|,|;|؛|\bor\b|\bOR\b|او|أو)\s*", text)
    out: list[str] = []
    for p in pieces:
        p = p.strip(" -–—:\t\n\r")
        if p and len(_tokens(p)) > 0:
            out.append(p)
    return out or ([text.strip()] if text and text.strip() else [])

@lru_cache(maxsize=1)
def _compiled_alias_groups() -> Dict[str, tuple[re.Pattern[str], ...]]:
    compiled: Dict[str, tuple[re.Pattern[str], ...]] = {}
    for canonical, aliases in ALIAS_GROUPS.items():
        pats = []
        for alias in aliases:
            n = _norm(alias)
            if n:
                pats.append(re.compile(_word_re(n), re.I))
        compiled[canonical] = tuple(pats)
    return compiled

def _matched_alias_groups(text: str) -> set[str]:
    norm = _norm(text)
    found: set[str] = set()
    for canonical, pats in _compiled_alias_groups().items():
        if any(p.search(norm) for p in pats):
            found.add(canonical)
    return found

def extract_domain_terms(text: str, categories=None):
    groups = _matched_alias_groups(text)
    if categories is None:
        return sorted(groups)
    cats = {str(c).lower() for c in categories}
    if "role" in cats:
        return sorted(groups & ROLE_GROUPS)
    return sorted(groups)

def expand_text_with_aliases(text: str) -> str:
    base = text or ""
    groups = _matched_alias_groups(base)
    if not groups:
        return base
    hints: list[str] = []
    for g in sorted(groups):
        hints.append(g.replace("_", " "))
        hints.extend(ALIAS_GROUPS.get(g, ()))
    seen: set[str] = set()
    dedup: list[str] = []
    for h in hints:
        nh = _norm(h)
        if nh and nh not in seen:
            seen.add(nh)
            dedup.append(nh)
    return base + "\n\n[semantic aliases] " + " ; ".join(dedup)

def _phrase_score_one(requirement: str, resume_pool: str) -> float:
    req_norm = _norm(requirement)
    pool_norm = _norm(resume_pool)
    if not req_norm:
        return 0.0
    if req_norm in pool_norm:
        return 1.0

    req_groups = _matched_alias_groups(requirement)
    pool_groups = _matched_alias_groups(resume_pool)
    common_groups = req_groups & pool_groups
    if common_groups:
        if common_groups & ROLE_GROUPS:
            return 0.96
        return 0.90

    req_expanded = expand_text_with_aliases(requirement)
    pool_expanded = expand_text_with_aliases(resume_pool)
    req_tokens = _token_set(req_expanded)
    pool_tokens = _token_set(pool_expanded)
    if not req_tokens:
        return 0.0
    token_containment = len(req_tokens & pool_tokens) / max(1, len(req_tokens))
    if len(req_tokens) <= 3 and token_containment >= 0.66:
        return max(0.80, token_containment)
    if token_containment >= 0.75:
        return max(0.82, token_containment)
    if token_containment >= 0.55 and (req_groups or pool_groups):
        return max(0.68, token_containment)
    if token_containment >= 0.45:
        return token_containment
    return 0.0

def requirement_match_score(requirement: str, resume_text: str, parsed: Dict[str, Any] | None = None) -> float:
    parsed = parsed or {}
    requirement = requirement or ""
    resume_text = resume_text or ""
    pool = resume_text + "\n" + _parsed_text(parsed)

    required_years = _required_years_from_value(requirement)
    if required_years > 0 and re.search(r"years?|سنوات|سنه|سنة|عام|اعوام|خبر", requirement, re.I):
        available = _estimate_years(pool, parsed)
        years_score = 1.0 if available >= required_years else max(0.0, min(1.0, available / max(required_years, 1e-6)))
        domain_score = max((_phrase_score_one(alt, pool) for alt in _split_alternatives(requirement)), default=0.0)
        return max(years_score if years_score >= 1.0 else 0.0, min(1.0, 0.70 * years_score + 0.30 * domain_score))

    scores = [_phrase_score_one(alt, pool) for alt in _split_alternatives(requirement)]
    scores.append(_phrase_score_one(requirement, pool))
    return max(0.0, min(1.0, max(scores or [0.0])))

def requirement_is_met(requirement: str, resume_text: str, parsed: Dict[str, Any] | None = None, *, threshold: float = 0.62) -> bool:
    return requirement_match_score(requirement, resume_text, parsed) >= threshold

MET_THRESHOLD = 0.62
STRONG_THRESHOLD = 0.78


def _norm(s: str) -> str:
    return normalize_text((s or "").translate(_ARABIC_DIGITS))


def _as_list(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(x) for x in value if str(x).strip()]
    if isinstance(value, dict):
        return [str(x) for x in value.values() if str(x).strip()]
    return [str(value)] if str(value).strip() else []


def _parsed_text(parsed: Dict[str, Any]) -> str:
    parsed = parsed or {}
    parts: List[str] = []
    for key in (
        "name", "headline", "summary", "objective", "current_title",
        "skills", "languages", "education", "certs", "certifications",
        "roles", "experience", "work_experience", "projects",
    ):
        parts.extend(_as_list(parsed.get(key)))
    return "\n".join(parts)


def _resume_pool(resume_text: str, parsed: Dict[str, Any]) -> str:
    return expand_text_with_aliases(f"{resume_text or ''}\n{_parsed_text(parsed or {})}")


def _contains(text: str, needle: str, parsed: Dict[str, Any] | None = None) -> bool:
    if not needle:
        return False
    pool = _resume_pool(text, parsed or {})
    if _norm(needle) and _norm(needle) in _norm(pool):
        return True
    needle_terms = set(extract_domain_terms(needle))
    text_terms = set(extract_domain_terms(pool))
    if needle_terms and (needle_terms & text_terms):
        return True
    return requirement_is_met(needle, pool, parsed or {}, threshold=MET_THRESHOLD)


def _snippet_around(text: str, needle: str, window: int = 140) -> Optional[str]:
    t = text or ""
    n = (needle or "").strip()
    if not t or not n:
        return None
    idx = _norm(t).find(_norm(n))
    if idx < 0:
        return None
    try:
        idx2 = t.lower().find(n.lower())
    except Exception:
        idx2 = idx
    if idx2 < 0:
        idx2 = idx
    start = max(0, idx2 - window)
    end = min(len(t), idx2 + len(n) + window)
    sn = t[start:end].strip()
    if len(sn) > 380:
        sn = sn[:380] + "…"
    return sn


def _best_passage_by_embeddings(
    query_emb: np.ndarray,
    chunk_embs: np.ndarray,
    chunks: List[str],
    *,
    top_n: int = 8,
) -> List[Tuple[str, float]]:
    if chunk_embs is None or len(chunks) == 0:
        return []
    if query_emb is None:
        return []
    sims = (chunk_embs @ query_emb).astype(np.float32)
    idxs = np.argsort(-sims)[: min(top_n, len(chunks))]
    return [(chunks[int(i)], float(sims[int(i)])) for i in idxs]


def _bi(ar: str, en: str) -> str:
    return f"{en} | {ar}"


def _evidence_for_query(
    *,
    query: str,
    resume_text: str,
    chunks: List[str],
    query_emb: Optional[np.ndarray],
    chunk_embs: Optional[np.ndarray],
    rerank_fn=None,
    needle: Optional[str] = None,
) -> Dict[str, Any]:
    if needle:
        sn = _snippet_around(resume_text, needle)
        if sn:
            return {
                "snippet": sn,
                "method": "substring",
                "reranker_score": None,
                "embedding_score": None,
            }

    cands = _best_passage_by_embeddings(query_emb, chunk_embs, chunks, top_n=8)
    if not cands:
        return {"snippet": None, "method": "none", "embedding_score": None, "reranker_score": None}

    passages = [p for p, _ in cands]
    best_emb = cands[0][1]

    if rerank_fn is not None:
        try:
            probs = rerank_fn(query, passages)
            if probs:
                best_i = int(np.argmax(np.array(probs)))
                return {
                    "snippet": passages[best_i][:420] + ("…" if len(passages[best_i]) > 420 else ""),
                    "method": "embedding+rerank",
                    "embedding_score": float(best_emb),
                    "reranker_score": float(probs[best_i]),
                }
        except Exception:
            pass

    return {
        "snippet": passages[0][:420] + ("…" if len(passages[0]) > 420 else ""),
        "method": "embedding",
        "embedding_score": float(best_emb),
        "reranker_score": None,
    }


def _extract_years_from_text(text: str) -> float:
    t = (text or "").translate(_ARABIC_DIGITS)
    nums: List[float] = []

    for m in re.finditer(r"(\d{1,2}(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?|سنوات|سنة|سنه|عام|اعوام)", t, flags=re.I):
        try:
            nums.append(float(m.group(1)))
        except Exception:
            pass

    current = date.today().year
    range_re = re.compile(
        r"\b(19\d{2}|20\d{2})\b\s*(?:-|–|—|to|حتى|الى|إلى|لـ|ل)\s*"
        r"(present|current|now|today|الان|الآن|حاليا|حاليًا|حتى الان|حتى الآن|19\d{2}|20\d{2})",
        flags=re.I,
    )
    for m in range_re.finditer(t):
        try:
            start = int(m.group(1))
            raw_end = _norm(m.group(2))
            end = current if raw_end in {"present", "current", "now", "today", "الان", "حاليا", "حالي ا", "حتى الان"} else int(raw_end)
            if 0 <= end - start <= 60:
                nums.append(float(end - start))
        except Exception:
            pass

    # Pattern like: 2010 حتى الان may be separated by Arabic text extraction with spaces.
    for m in re.finditer(r"\b(19\d{2}|20\d{2})\b.{0,30}(?:الان|الآن|حاليا|حاليًا|present|current|now)", t, flags=re.I | re.S):
        try:
            start = int(m.group(1))
            if 0 <= current - start <= 60:
                nums.append(float(current - start))
        except Exception:
            pass

    return float(max(nums)) if nums else 0.0


def _parsed_years(parsed: Dict[str, Any]) -> float:
    parsed = parsed or {}
    candidates = [parsed.get("total_years"), parsed.get("years"), parsed.get("experience_years")]
    for c in candidates:
        try:
            value = float(c or 0.0)
            if value > 0:
                return value
        except Exception:
            pass
    return 0.0


def _estimate_years(resume_text: str, parsed: Dict[str, Any]) -> float:
    return max(_parsed_years(parsed), _extract_years_from_text(resume_text), _extract_years_from_text(_parsed_text(parsed)))


def _required_years_from_value(val: str) -> float:
    val = (val or "").translate(_ARABIC_DIGITS)
    nums = re.findall(r"\d{1,2}(?:\.\d+)?", val)
    if not nums:
        return 0.0
    try:
        return float(nums[0])
    except Exception:
        return 0.0


def _structured_pool(tp: str, parsed: Dict[str, Any]) -> set[str]:
    parsed = parsed or {}
    if tp == "skill":
        keys = ("skills", "roles")
    elif tp == "language":
        keys = ("languages",)
    elif tp == "education":
        keys = ("education",)
    elif tp == "cert":
        keys = ("certs", "certifications")
    else:
        keys = ()

    values: List[str] = []
    for key in keys:
        values.extend(_as_list(parsed.get(key)))
    return {_norm(x) for x in values if _norm(x)}


def _semantic_requirement_score(val: str, resume_text: str, parsed: Dict[str, Any]) -> float:
    pool = _resume_pool(resume_text, parsed)
    return float(max(0.0, min(1.0, requirement_match_score(val, pool, parsed))))


def compute_requirements_score(
    requirements: List[Dict[str, Any]],
    resume_text: str,
    parsed: Dict[str, Any],
    *,
    chunks: Optional[List[str]] = None,
    chunk_embs: Optional[np.ndarray] = None,
    query_embedder=None,
    rerank_fn=None,
    semantic_threshold: float = 0.62,
) -> Dict[str, Any]:
    rtext = resume_text or ""
    parsed = parsed or {}
    resume_pool = _resume_pool(rtext, parsed)

    details: List[Dict[str, Any]] = []
    by_type: Dict[str, Any] = {}

    total_w = 0.0
    got_w = 0.0
    must_missing = 0
    years = _estimate_years(rtext, parsed)

    def add_type(tp: str, w: float, score: float):
        d = by_type.get(tp) or {"total_w": 0.0, "got_w": 0.0, "count": 0, "matched": 0}
        d["total_w"] += w
        d["count"] += 1
        d["got_w"] += w * score
        if score >= MET_THRESHOLD:
            d["matched"] += 1
        by_type[tp] = d

    required_years = None

    for req in (requirements or []):
        try:
            total_w += max(0.1, float(req.get("weight") or 1.0))
        except Exception:
            total_w += 1.0
    if total_w <= 0:
        total_w = 1.0

    for req in (requirements or []):
        tp = str(req.get("req_type") or "").lower().strip()
        val = str(req.get("req_value") or req.get("value") or req.get("text") or "").strip()
        try:
            w = max(0.1, float(req.get("weight") or 1.0))
        except Exception:
            w = 1.0
        must = bool(req.get("must_have"))

        match_score = 0.0
        reason = ""
        evidence = {"snippet": None, "method": "none", "embedding_score": None, "reranker_score": None}

        if tp == "years":
            need = _required_years_from_value(val)
            required_years = need if need > 0 else required_years
            if need > 0:
                match_score = max(0.0, min(1.0, years / need))
                ok = years >= need
                reason = _bi(
                    f"سنوات الخبرة المقدّرة {years:.1f} {'≥' if ok else '<'} {need:.1f}",
                    f"Estimated experience years {years:.1f} {'>=' if ok else '<'} {need:.1f}",
                )
            else:
                # If a years requirement was stored as free text, fall back to semantic matching.
                match_score = _semantic_requirement_score(val, rtext, parsed)
                reason = _bi("مطابقة خبرة نصية/معنوية", "Text/semantic experience match") if match_score >= MET_THRESHOLD else _bi("متطلب سنوات غير صالح", "Invalid years requirement")

        elif tp in ("skill", "language", "education", "cert"):
            norm_val = _norm(val)
            pool = _structured_pool(tp, parsed)
            semantic_score = _semantic_requirement_score(val, rtext, parsed)

            if norm_val and norm_val in pool:
                match_score = 1.0
                reason = _bi("موجود في البيانات المستخرجة من السيرة الذاتية", "Found in structured resume entities")
                evidence = _evidence_for_query(query=val, resume_text=rtext, chunks=chunks or [], query_emb=None, chunk_embs=chunk_embs, rerank_fn=rerank_fn, needle=val)
            elif _contains(rtext, val, parsed):
                match_score = max(0.88, semantic_score)
                reason = _bi("تم العثور عليه كنص أو كمصطلح مكافئ داخل السيرة", "Found as direct text or equivalent domain term in the resume")
                evidence = {"snippet": _snippet_around(rtext, val), "method": "domain/substring", "embedding_score": None, "reranker_score": None}
            else:
                qemb = query_embedder(expand_text_with_aliases(val)) if query_embedder else None
                evidence = _evidence_for_query(query=val, resume_text=rtext, chunks=chunks or [], query_emb=qemb, chunk_embs=chunk_embs, rerank_fn=rerank_fn, needle=None)
                rr = evidence.get("reranker_score")
                emb = evidence.get("embedding_score")

                if semantic_score >= MET_THRESHOLD:
                    match_score = max(0.78, semantic_score)
                    reason = _bi("مطابقة معنوية/قاموسية قوية", "Strong semantic/domain-lexicon match")
                elif rr is not None and float(rr) >= semantic_threshold:
                    match_score = float(rr)
                    reason = _bi("مطابقة معنوية قوية بواسطة معيد الترتيب", "Strong semantic match from reranker")
                elif emb is not None and float(emb) >= 0.35:
                    match_score = max(0.35, min(0.75, 0.55 + 0.4 * float(emb)))
                    reason = _bi("مطابقة معنوية محتملة بواسطة التضمين", "Probable semantic match from embeddings")
                elif semantic_score >= 0.45:
                    match_score = semantic_score
                    reason = _bi("مطابقة جزئية", "Partial match")
                else:
                    match_score = 0.0
                    reason = _bi("غير موجود", "Not found")

        else:
            if not val:
                match_score = 0.0
                reason = _bi("متطلب فارغ", "Empty requirement")
            else:
                semantic_score = _semantic_requirement_score(val, rtext, parsed)
                if _contains(rtext, val, parsed):
                    match_score = max(0.88, semantic_score)
                    reason = _bi("تم العثور على النص أو معنى مكافئ", "Direct or equivalent semantic match found")
                    evidence = {"snippet": _snippet_around(rtext, val), "method": "domain/substring", "embedding_score": None, "reranker_score": None}
                else:
                    qemb = query_embedder(expand_text_with_aliases(val)) if query_embedder else None
                    evidence = _evidence_for_query(query=val, resume_text=rtext, chunks=chunks or [], query_emb=qemb, chunk_embs=chunk_embs, rerank_fn=rerank_fn, needle=None)
                    rr = evidence.get("reranker_score")
                    emb = evidence.get("embedding_score")

                    if semantic_score >= MET_THRESHOLD:
                        match_score = max(0.78, semantic_score)
                        reason = _bi("مطابقة معنوية/قاموسية قوية", "Strong semantic/domain-lexicon match")
                    elif rr is not None and float(rr) >= semantic_threshold:
                        match_score = float(rr)
                        reason = _bi("مطابقة معنوية قوية بواسطة معيد الترتيب", "Strong semantic match from reranker")
                    elif emb is not None and float(emb) >= 0.35:
                        match_score = max(0.30, min(0.70, 0.50 + 0.35 * float(emb)))
                        reason = _bi("مطابقة معنوية محتملة بواسطة التضمين", "Probable semantic match from embeddings")
                    elif semantic_score >= 0.45:
                        match_score = semantic_score
                        reason = _bi("مطابقة جزئية", "Partial match")
                    else:
                        match_score = 0.0
                        reason = _bi("غير موجود", "Not found")

        match_score = float(max(0.0, min(1.0, match_score)))
        earned_w = w * match_score
        got_w += earned_w

        if must and match_score < MET_THRESHOLD:
            must_missing += 1

        add_type(tp, w, match_score)

        details.append(
            {
                "req_type": tp,
                "req_value": val,
                "weight": w,
                "must_have": must,
                "match_score": match_score,
                "percent": float((w / total_w) * 100.0),
                "earned": float((earned_w / total_w) * 100.0),
                "matched": bool(match_score >= MET_THRESHOLD),
                "reason": reason,
                "evidence": evidence,
            }
        )

    requirements_score_raw = 0.0 if total_w <= 0 else got_w / total_w
    requirements_score_raw = max(0.0, min(1.0, float(requirements_score_raw)))

    must_have_multiplier = 1.0
    if must_missing > 0:
        must_have_multiplier = max(0.0, 1.0 - (0.18 * must_missing))

    requirements_score = max(0.0, min(1.0, requirements_score_raw * must_have_multiplier))

    for tp, d in by_type.items():
        d["score"] = 0.0 if d["total_w"] <= 0 else d["got_w"] / d["total_w"]

    missing = [d for d in details if not d["matched"]]
    matched = sorted([d for d in details if d["matched"]], key=lambda x: x["earned"], reverse=True)
    missing_must = [d for d in missing if d.get("must_have")]

    return {
        "requirements_score": requirements_score,
        "requirements_score_raw": requirements_score_raw,
        "must_have_multiplier": must_have_multiplier,
        "must_have_missing": must_missing,
        "missing_must_have": missing_must,
        "matched": matched,
        "missing": missing,
        "details": sorted(details, key=lambda x: x["earned"], reverse=True),
        "by_type": by_type,
        "years_est": years,
        "required_years": required_years,
    }


def final_score(similarity: float, requirements_score: float) -> float:
    sim = max(0.0, min(1.0, float(similarity)))
    req = max(0.0, min(1.0, float(requirements_score)))

    # If requirements are very strong, do not let a weak local/offline embedding destroy the result.
    if req >= 0.80 and sim < 0.45:
        sim = max(sim, 0.55)
    elif req >= 0.65 and sim < 0.35:
        sim = max(sim, 0.42)

    score = 0.60 * sim + 0.40 * req
    return max(0.0, min(1.0, score))


def build_explanation(similarity: float, req_break: Dict[str, Any]) -> str:
    must_missing = int(req_break.get("must_have_missing") or 0)
    req_score = float(req_break.get("requirements_score") or 0.0)
    sim = float(similarity or 0.0)
    years_est = float(req_break.get("years_est") or 0.0)
    parts = [
        _bi(f"التشابه الدلالي={sim:.3f}", f"Semantic similarity={sim:.3f}"),
        _bi(f"درجة المتطلبات={req_score:.3f}", f"Requirements score={req_score:.3f}"),
        _bi(f"سنوات الخبرة≈{years_est:.1f}", f"Years≈{years_est:.1f}"),
    ]
    if must_missing:
        parts.append(_bi(f"يوجد {must_missing} متطلب/متطلبات أساسية مفقودة وتم تطبيق عقوبة", f"Missing {must_missing} must-have requirement(s); penalty applied"))
    return " | ".join(parts)
