from __future__ import annotations

import math
import os
from typing import List, Optional


_TOKENIZER = None
_MODEL = None


def _sigmoid(x: float) -> float:
    # stable-ish sigmoid
    if x >= 0:
        z = math.exp(-x)
        return 1.0 / (1.0 + z)
    z = math.exp(x)
    return z / (1.0 + z)


def get_reranker_model_id() -> str:
    """Return HF model id OR local path.

    - If RERANKER_MODEL_DIR is set and exists, we load from that local folder (works with git lfs clone).
    - Otherwise we fall back to RERANKER_MODEL_ID (HF repo id).
    """
    local_dir = os.getenv("RERANKER_MODEL_DIR")
    if local_dir and os.path.isdir(local_dir):
        return local_dir
    return os.getenv("RERANKER_MODEL_ID", "BAAI/bge-reranker-v2-m3")


def load_reranker():
    """Lazy-load BGE reranker (cross-encoder)."""
    global _TOKENIZER, _MODEL
    if _TOKENIZER is not None and _MODEL is not None:
        return _TOKENIZER, _MODEL

    # Local import so the project can still run without reranker deps.
    from transformers import AutoModelForSequenceClassification, AutoTokenizer
    import torch

    model_id = get_reranker_model_id()
    _TOKENIZER = AutoTokenizer.from_pretrained(model_id)
    _MODEL = AutoModelForSequenceClassification.from_pretrained(model_id)
    _MODEL.eval()
    _MODEL.to(torch.device("cpu"))
    return _TOKENIZER, _MODEL


def rerank(
    query: str,
    passages: List[str],
    *,
    max_length: int = 512,
    batch_size: int = 16,
) -> List[float]:
    """Return relevance probabilities in [0..1] for each passage."""
    if not passages:
        return []

    tok, model = load_reranker()
    import torch

    scores: List[float] = []
    pairs = [[query, p] for p in passages]
    with torch.no_grad():
        for i in range(0, len(pairs), batch_size):
            batch = pairs[i : i + batch_size]
            inputs = tok(
                batch,
                padding=True,
                truncation=True,
                max_length=max_length,
                return_tensors="pt",
            )
            logits = model(**inputs).logits.view(-1).detach().cpu().tolist()
            scores.extend([float(_sigmoid(x)) for x in logits])

    return scores


def pick_best(
    query: str,
    passages: List[str],
    *,
    top_k: int = 3,
) -> List[dict]:
    """Return top_k passages with reranker scores."""
    probs = rerank(query, passages)
    ranked = sorted(
        [(p, float(s)) for p, s in zip(passages, probs)],
        key=lambda x: x[1],
        reverse=True,
    )
    return [{"text": p, "score": s} for p, s in ranked[: max(1, top_k)]]
