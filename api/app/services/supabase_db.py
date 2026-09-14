from __future__ import annotations

import os
from dotenv import load_dotenv

load_dotenv()


def get_supabase_admin():
    try:
        from supabase import create_client  # type: ignore
    except Exception as exc:
        raise RuntimeError(
            "Supabase client is not installed. Run 'pip install -r requirements.txt' before using database features."
        ) from exc

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)
