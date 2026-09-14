import re
from typing import List


def split_into_chunks(text: str, *, max_chars: int = 900, min_chars: int = 200) -> List[str]:
    """Split resume text into chunks for retrieval / reranking.

    Strategy:
    - Prefer paragraph boundaries.
    - Fall back to sentence splitting for very long paragraphs.
    - Merge tiny tail chunks.

    We keep this char-based (not token-based) to avoid extra dependencies.
    """

    t = (text or "").replace("\r", "\n")
    paras = [p.strip() for p in re.split(r"\n{2,}", t) if p.strip()]
    if not paras:
        return []

    chunks: List[str] = []
    buf = ""

    def flush():
        nonlocal buf
        if buf.strip():
            chunks.append(buf.strip())
        buf = ""

    for p in paras:
        if len(p) > max_chars:
            # sentence-ish split
            sents = [s.strip() for s in re.split(r"(?<=[\.!?\u061F])\s+", p) if s.strip()]
            for s in sents:
                if not buf:
                    buf = s
                elif len(buf) + 1 + len(s) <= max_chars:
                    buf = buf + " " + s
                else:
                    flush()
                    buf = s
            continue

        if not buf:
            buf = p
        elif len(buf) + 2 + len(p) <= max_chars:
            buf = buf + "\n\n" + p
        else:
            flush()
            buf = p

    flush()

    # merge tiny tail chunks
    merged: List[str] = []
    for c in chunks:
        if merged and len(c) < min_chars and len(merged[-1]) + 1 + len(c) <= max_chars:
            merged[-1] = merged[-1] + "\n" + c
        else:
            merged.append(c)

    # de-dup exact repeats
    seen = set()
    out = []
    for c in merged:
        k = re.sub(r"\s+", " ", c).strip().lower()
        if not k or k in seen:
            continue
        seen.add(k)
        out.append(c)

    return out
