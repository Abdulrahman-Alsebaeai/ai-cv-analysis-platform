"""Authentication helpers (placeholder).

✅ تم تصحيح هذا الملف ليكون Python صالح بدل الصيغة السابقة (/* */).

المشروع الحالي يستخدم حماية بسيطة عبر API Key:
- الهيدر: x-api-key
- القيمة: ANALYSIS_API_KEY (في env)

يمكنك لاحقًا إضافة تحقق JWT من Supabase هنا إذا رغبت.
"""

from __future__ import annotations

import os
from fastapi import Header, HTTPException, status


def require_api_key(x_api_key: str | None = Header(default=None, alias="x-api-key")) -> None:
    """يرفض الطلب إذا كان ANALYSIS_API_KEY مضبوطًا ولا يطابق x-api-key."""
    expected = os.getenv("ANALYSIS_API_KEY")
    if expected and x_api_key != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )
