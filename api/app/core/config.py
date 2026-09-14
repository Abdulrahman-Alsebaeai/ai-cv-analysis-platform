"""Configuration (placeholder).

✅ تم تصحيح هذا الملف ليكون Python صالح بدل الصيغة السابقة (/* */).

يمكنك لاحقًا إضافة Settings عبر Pydantic هنا.
"""

from __future__ import annotations

import os


def get_env(name: str, default: str | None = None) -> str | None:
    return os.getenv(name, default)
