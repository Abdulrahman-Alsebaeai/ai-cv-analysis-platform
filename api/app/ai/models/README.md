# Optional Local Embedding Model

By default the backend uses `EMBEDDING_MODE=cheap_local`, a lightweight offline hashing embedder that requires no downloaded model.

If you choose the optional Hugging Face path, place the complete local model under `api/app/ai/models/e5/` or configure `MODEL_DIR`. Large model files are intentionally excluded from Git.
