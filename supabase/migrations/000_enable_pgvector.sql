-- Enable pgvector for embeddings similarity
create extension if not exists vector;

-- Optional but helpful
create extension if not exists pgcrypto;
