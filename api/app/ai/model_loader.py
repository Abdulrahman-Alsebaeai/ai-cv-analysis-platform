from __future__ import annotations

import os
import re
import hashlib
from pathlib import Path

import numpy as np
from dotenv import load_dotenv

load_dotenv()


def _bool_env(name: str, default: str = "0") -> bool:
    return os.getenv(name, default).strip().lower() in {"1", "true", "yes", "on"}


def _normalize_rows(x: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(x, axis=1, keepdims=True)
    norms = np.where(norms == 0, 1.0, norms)
    return x / norms


class CheapLocalEmbedder:
    """
    Embedding محلي خفيف جدًا بدون إنترنت وبدون موديلات خارجية.
    يعتمد على hashing bag-of-words.
    ليس بجودة E5، لكنه عملي جدًا للأوفلاين.
    """

    def __init__(self, dim: int = 384):
        self.dim = dim

    def _tokenize(self, text: str) -> list[str]:
        
        try:
            from app.ai.domain_lexicon import expand_text_with_aliases
            text = expand_text_with_aliases(text)
        except Exception:
            pass
        text = (text or "").lower()
        return re.findall(r"[\u0600-\u06FFa-zA-Z0-9_+\-\.#]{2,}", text)

    def _hash_index(self, token: str) -> int:
        h = hashlib.md5(token.encode("utf-8")).hexdigest()
        return int(h, 16) % self.dim

    def _encode_one(self, text: str) -> np.ndarray:
        vec = np.zeros(self.dim, dtype=np.float32)
        tokens = self._tokenize(text)

        for tok in tokens:
            idx = self._hash_index(tok)
            vec[idx] += 1.0

        # إشارة بسيطة للـ bigrams لتحسين الدقة قليلًا
        for i in range(len(tokens) - 1):
            bi = tokens[i] + "::" + tokens[i + 1]
            idx = self._hash_index(bi)
            vec[idx] += 0.5

        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec

    def encode(
        self,
        sentences,
        normalize_embeddings: bool = True,
        convert_to_numpy: bool = True,
        **kwargs,
    ):
        single = False
        if isinstance(sentences, str):
            single = True
            sentences = [sentences]

        arr = np.vstack([self._encode_one(s) for s in sentences]).astype(np.float32)

        if normalize_embeddings:
            arr = _normalize_rows(arr)

        if single:
            return arr[0] if convert_to_numpy else arr[0].tolist()

        return arr if convert_to_numpy else arr.tolist()


def _is_complete_model_dir(path: str) -> bool:
    p = Path(path)
    if not p.is_dir():
        return False

    has_config = (p / "config.json").is_file() or (p / "modules.json").is_file()
    has_weights = any(
        (p / name).is_file()
        for name in ("pytorch_model.bin", "model.safetensors")
    )
    has_tokenizer = any(
        (p / name).is_file()
        for name in (
            "tokenizer.json",
            "tokenizer_config.json",
            "sentencepiece.bpe.model",
            "spiece.model",
            "vocab.txt",
        )
    )
    return has_config and has_weights and has_tokenizer


def load_e5_model():
    """
    وضعان:
    1) cheap_local: لا يحتاج إنترنت نهائيًا
    2) hf/local model: يستخدم موديل جاهز فقط إذا كان موجودًا محليًا بشكل مكتمل
    """
    embedding_mode = os.getenv("EMBEDDING_MODE", "cheap_local").strip().lower()
    skip_download = _bool_env("SKIP_HF_DOWNLOAD", "1")
    local_dir = os.getenv("MODEL_DIR", "app/ai/models/e5").strip()

    # الوضع الأرخص والأضمن لك
    if embedding_mode == "cheap_local":
        return CheapLocalEmbedder()

    # لو تريد استخدام موديل محلي موجود أصلًا بدون تنزيل
    if _is_complete_model_dir(local_dir):
        try:
            from sentence_transformers import SentenceTransformer
            return SentenceTransformer(local_dir, device="cpu")
        except Exception:
            # fallback آمن
            return CheapLocalEmbedder()

    # لا تنزيل من الإنترنت
    if skip_download:
        return CheapLocalEmbedder()

    # لو فتحت الإنترنت مستقبلًا وتريد السماح بالتنزيل
    try:
        from huggingface_hub import snapshot_download
        from sentence_transformers import SentenceTransformer

        os.makedirs(local_dir, exist_ok=True)
        model_id = os.getenv("MODEL_ID", "intfloat/multilingual-e5-small").strip()

        snapshot_download(
            repo_id=model_id,
            local_dir=local_dir,
            allow_patterns=[
                "config.json",
                "modules.json",
                "sentence_bert_config.json",
                "tokenizer_config.json",
                "tokenizer.json",
                "special_tokens_map.json",
                "sentencepiece.bpe.model",
                "spiece.model",
                "vocab.txt",
                "1_Pooling/config.json",
                "model.safetensors",
            ],
            ignore_patterns=[
                "*.h5",
                "tf_model.h5",
                "flax_model.msgpack",
                "rust_model.ot",
                "onnx/*",
                "openvino/*",
                "*.onnx",
                "*.xml",
                "*.bin",
            ],
        )
        return SentenceTransformer(local_dir, device="cpu")
    except Exception:
        return CheapLocalEmbedder()