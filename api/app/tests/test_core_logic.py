from app.ai.jd_parser import parse_job_description_to_requirements
from app.ai.stuffing import analyze_keyword_stuffing


def test_jd_parser_returns_requirements():
    out = parse_job_description_to_requirements(
        "Senior Python Engineer",
        "Required: Python, FastAPI, 5 years experience. Nice to have: AWS.",
    )
    assert isinstance(out, dict)
    assert out.get("requirements")


def test_stuffing_detector_flags_repetition():
    reqs = [{"req_type": "skill", "req_value": "python", "weight": 1, "must_have": True}]
    text = ("python " * 80) + " developer fastapi backend"
    out = analyze_keyword_stuffing(text, reqs, parsed_entities={})
    assert isinstance(out, dict)
    assert "penalty" in out
