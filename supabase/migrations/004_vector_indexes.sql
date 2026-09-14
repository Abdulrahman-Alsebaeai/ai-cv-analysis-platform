-- HNSW indexes for faster vector search
create index if not exists job_embeddings_hnsw
on public.job_embeddings
using hnsw (embedding vector_cosine_ops);

create index if not exists resume_embeddings_hnsw
on public.resume_embeddings
using hnsw (embedding vector_cosine_ops);

-- Optional: check pgvector version
-- SELECT * FROM pg_extension WHERE extname = 'vector';
