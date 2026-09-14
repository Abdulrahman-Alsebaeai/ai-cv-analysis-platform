"""Supabase Storage helpers.

This module is intentionally small; the project mostly uses the Supabase client
 directly. Helpers stay import-safe even when supabase-py is not installed yet.
"""

from __future__ import annotations

import os
from typing import Any, Optional

from app.services.supabase_db import get_supabase_admin


def get_bucket_name() -> str:
    return os.getenv("SUPABASE_RESUMES_BUCKET", "resumes")


def get_storage(sb: Optional[Any] = None):
    sb = sb or get_supabase_admin()
    return sb.storage.from_(get_bucket_name())


def download(path: str, *, sb: Optional[Any] = None) -> bytes:
    return get_storage(sb).download(path)


def upload(path: str, data: bytes, *, content_type: Optional[str] = None, sb: Optional[Any] = None):
    opts = {"contentType": content_type} if content_type else None
    return get_storage(sb).upload(path, data, opts)


def create_signed_url(path: str, expires_in: int = 3600, *, sb: Optional[Any] = None) -> str:
    res = get_storage(sb).create_signed_url(path, expires_in)
    if isinstance(res, dict) and res.get("signedURL"):
        return str(res["signedURL"])
    if hasattr(res, "get") and res.get("signedURL"):
        return str(res.get("signedURL"))
    return ""
