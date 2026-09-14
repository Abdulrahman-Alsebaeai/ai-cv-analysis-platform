-- Vector indexes (ivfflat) speed up similarity search.
-- Note: ivfflat requires enough rows to be effective; safe to create anyway.

-- JOBS embedding index
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='jobs' and column_name='embedding') then
    execute 'create index if not exists jobs_embedding_ivfflat
             on public.jobs using ivfflat (embedding vector_cosine_ops) with (lists = 100);';
  end if;
end $$;

-- RESUMES embedding index
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='resumes' and column_name='embedding') then
    execute 'create index if not exists resumes_embedding_ivfflat
             on public.resumes using ivfflat (embedding vector_cosine_ops) with (lists = 100);';
  end if;
end $$;
