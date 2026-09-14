def to_pgvector_str(vec: list[float]) -> str:
    # pgvector string format: [0.1,0.2,0.3]
    return "[" + ",".join(f"{x:.8f}" for x in vec) + "]"
