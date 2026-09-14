from __future__ import annotations

import os
from typing import Any

_SUPABASE: Any | None = None


def _load_supabase():
    try:
        from supabase import Client, create_client  # type: ignore
        return Client, create_client
    except Exception as exc:
        raise RuntimeError(
            "Supabase client is not installed. Run 'pip install -r requirements.txt' before using database features."
        ) from exc


def get_supabase():
    global _SUPABASE
    if _SUPABASE is not None:
        return _SUPABASE

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

    if not url or not key:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY env vars")

    _, create_client = _load_supabase()
    _SUPABASE = create_client(url, key)
    return _SUPABASE
