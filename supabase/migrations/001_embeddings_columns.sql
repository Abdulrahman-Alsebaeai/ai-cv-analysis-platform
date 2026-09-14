-- Ensure key tables exist and have embedding columns.
-- Adjust table/column names if your schema differs.

-- JOBS
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='jobs') then
    alter table public.jobs
      add column if not exists embedding vector(1536);
  end if;
end $$;

-- RESUMES
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='resumes') then
    alter table public.resumes
      add column if not exists embedding vector(1536),
      add column if not exists text_extracted text,
      add column if not exists parsed_json jsonb;
  end if;
end $$;

-- APPLICATIONS (Scores/Breakdown)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='applications') then
    alter table public.applications
      add column if not exists final_score double precision,
      add column if not exists breakdown jsonb,
      add column if not exists status text;
  end if;
end $$;

-- If you store scores in a separate table, add similar columns there as needed.
