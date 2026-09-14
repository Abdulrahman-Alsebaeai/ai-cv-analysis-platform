from __future__ import annotations

import re
from functools import lru_cache
from typing import Iterable, List

try:
    from app.ai.domain_lexicon import all_alias_terms, normalize_text
except Exception:  # pragma: no cover - safe fallback during partial imports
    def all_alias_terms() -> List[str]:
        return []
    def normalize_text(text: str) -> str:
        return re.sub(r"\s+", " ", (text or "").strip().lower())

TECH_SKILLS = {
    "python", "java", "javascript", "typescript", "c", "c++", "c#", "go", "rust", "php", "ruby", "scala", "kotlin", "swift",
    "react", "next.js", "node.js", "express", "fastapi", "django", "flask", "spring", "laravel", "dotnet", "asp.net",
    "html", "css", "sass", "tailwind", "bootstrap", "sql", "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
    "pandas", "numpy", "scikit-learn", "sklearn", "pytorch", "tensorflow", "keras", "nlp", "llm", "transformers",
    "aws", "gcp", "azure", "docker", "kubernetes", "helm", "terraform", "ansible", "ci/cd", "github actions", "gitlab ci",
    "power bi", "tableau", "excel", "airflow", "spark", "hadoop", "kafka", "oauth", "openid", "jwt", "sso", "git", "linux", "rest", "graphql", "microservices", "grpc",
}

# Keep the original IT coverage, but add professional/medical/business aliases so the matcher does not fail on non-IT jobs.
SKILLS = sorted({*TECH_SKILLS, *all_alias_terms()}, key=lambda x: (len(x), x))


def _normalize(text: str) -> str:
    return normalize_text(text)


@lru_cache(maxsize=None)
def _compile_pattern(skill: str) -> re.Pattern[str]:
    return re.compile(rf"(?<![\w+#./-]){re.escape(_normalize(skill))}(?![\w+#./-])", re.I)


def contains_skill(text: str, skill: str) -> bool:
    return bool(text and skill and _compile_pattern(skill).search(_normalize(text)))


def extract_skills_from_text(text: str, candidates: Iterable[str] | None = None) -> List[str]:
    haystack = _normalize(text)
    skills = list(candidates) if candidates is not None else SKILLS
    return sorted({skill for skill in skills if _compile_pattern(skill).search(haystack)}, key=lambda x: (len(x), x))
