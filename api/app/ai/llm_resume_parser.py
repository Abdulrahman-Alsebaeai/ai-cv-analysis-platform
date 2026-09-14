from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional


def _trim(text: str, max_chars: int = 14000) -> str:
    t = (text or "").strip()
    if len(t) <= max_chars:
        return t
    return t[:max_chars] + "\n\n[TRUNCATED]"


def _ensure_resume_keys(d: Dict[str, Any]) -> Dict[str, Any]:
    d = dict(d or {})
    d.setdefault("skills", [])
    d.setdefault("languages", [])
    d.setdefault("education", [])
    d.setdefault("certs", [])
    d.setdefault("roles", [])
    d.setdefault("total_years", 0.0)
    d.setdefault("experience", [])
    return d


def parse_resume_with_gemini(text: str) -> Optional[Dict[str, Any]]:
    """Parse a CV with Gemini if GEMINI_API_KEY is configured.

    The function is optional and fail-safe: missing SDK/key or API errors return None,
    allowing the deterministic parser to continue working offline.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None

    try:
        from google import genai
        from pydantic import BaseModel, Field
    except Exception:
        return None

    class Experience(BaseModel):
        title: str = ""
        company: str = ""
        start_date: str = ""
        end_date: str = ""
        summary: str = ""

    class ResumeEntities(BaseModel):
        skills: List[str] = Field(default_factory=list)
        languages: List[str] = Field(default_factory=list)
        education: List[str] = Field(default_factory=list)
        certs: List[str] = Field(default_factory=list)
        roles: List[str] = Field(default_factory=list)
        total_years: float = 0.0
        experience: List[Experience] = Field(default_factory=list)

    model = os.getenv("GEMINI_PARSE_MODEL", "gemini-2.5-flash")
    prompt = (
        "Extract structured CV information as JSON only. "
        "Include professional roles such as dentist, dental assistant, doctor, nurse, engineer, accountant, etc. "
        "Normalize equivalent Arabic/English terms where possible, but preserve important domain skills. "
        "If unknown, use empty lists or 0. The CV may be Arabic and/or English.\n\nCV:\n" + _trim(text)
    )

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_json_schema": ResumeEntities.model_json_schema(),
            },
        )
        parsed = ResumeEntities.model_validate_json(response.text)
        return _ensure_resume_keys(parsed.model_dump())
    except Exception:
        # Some older SDK builds use response_schema rather than response_json_schema; try the compatible path once.
        try:
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": ResumeEntities,
                },
            )
            parsed_obj = getattr(response, "parsed", None)
            if parsed_obj is not None:
                return _ensure_resume_keys(parsed_obj.model_dump() if hasattr(parsed_obj, "model_dump") else dict(parsed_obj))
            return _ensure_resume_keys(json.loads(response.text))
        except Exception:
            return None


def parse_resume_with_openai(text: str) -> Optional[Dict[str, Any]]:
    """Parse CV text into structured JSON using OpenAI Structured Outputs.

    Returns None if OPENAI_API_KEY is not set or the OpenAI SDK is unavailable.
    """

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    model = os.getenv("OPENAI_PARSE_MODEL", "gpt-4o-mini")

    try:
        from pydantic import BaseModel, Field
        from openai import OpenAI
    except Exception:
        return None

    class Experience(BaseModel):
        title: str = ""
        company: str = ""
        start_date: str = ""
        end_date: str = ""
        summary: str = ""

    class ResumeEntities(BaseModel):
        skills: List[str] = Field(default_factory=list)
        languages: List[str] = Field(default_factory=list)
        education: List[str] = Field(default_factory=list)
        certs: List[str] = Field(default_factory=list)
        roles: List[str] = Field(default_factory=list)
        total_years: float = 0.0
        experience: List[Experience] = Field(default_factory=list)

    client = OpenAI(api_key=api_key)

    prompt = (
        "Extract structured information from the resume text. "
        "Return data that matches the schema exactly. "
        "If a field is unknown, return an empty string / empty list / 0. "
        "Skills should be normalized (e.g., 'Amazon Web Services' -> 'AWS' if present), "
        "but keep original terms if unsure. Include roles such as dentist/doctor/nurse/engineer when present. "
        "The resume may be Arabic and/or English."
        "\n\nRESUME:\n" + _trim(text)
    )

    try:
        rsp = client.responses.parse(
            model=model,
            input=prompt,
            text_format=ResumeEntities,
        )
    except Exception:
        return None

    try:
        for output in rsp.output:
            if getattr(output, "type", None) != "message":
                continue
            for item in output.content:
                if getattr(item, "type", None) != "output_text":
                    continue
                parsed = getattr(item, "parsed", None)
                if parsed is None:
                    continue
                d = parsed.model_dump() if hasattr(parsed, "model_dump") else dict(parsed)
                return _ensure_resume_keys(d)
    except Exception:
        return None

    return None
