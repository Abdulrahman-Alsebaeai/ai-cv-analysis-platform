import numpy as np

def format_query(text: str) -> str:
    return f"query: {text.strip()}"

def format_passage(text: str) -> str:
    return f"passage: {text.strip()}"

def l2_normalize(vec: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(vec)
    if n == 0:
        return vec
    return vec / n
