from main import app
from services.pdf_report import render_job_report


def test_fastapi_app_created():
    assert app is not None
    assert getattr(app, "title", None)


def test_render_pdf_returns_bytes():
    data = render_job_report(
        {
            "job": {"title": "Backend Engineer", "description": "Python and FastAPI role"},
            "requirements": [],
            "candidates": [
                {
                    "rank": 1,
                    "name": "Alice",
                    "file_name": "alice.pdf",
                    "final_score": 0.92,
                    "raw_score": 0.94,
                    "penalty": 0.02,
                    "warnings": {"is_suspected": False},
                }
            ],
            "generated_at": "2026-04-11T00:00:00Z",
        }
    )
    assert isinstance(data, (bytes, bytearray))
    assert data[:4] == b"%PDF"
