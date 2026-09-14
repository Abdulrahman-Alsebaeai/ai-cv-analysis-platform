-- Extensions
create extension if not exists pgcrypto;
create extension if not exists vector;

-- Roles
do $$ begin
  create type public.user_role as enum ('admin','employer','evaluator','applicant');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.application_status as enum
  ('submitted','analyzing','analyzed','shortlisted','interview','rejected','hired');
exception when duplicate_object then null;
end $$;

-- Companies
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Profiles (linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role public.user_role not null default 'applicant',
  company_id uuid references public.companies(id),
  created_at timestamptz not null default now()
);

-- Jobs
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  title text not null,
  description text not null,
  location text,
  employment_type text, -- full-time/part-time/contract
  is_remote boolean not null default false,
  status text not null default 'open', -- open/closed/hidden
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Job requirements
create table if not exists public.job_requirements (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  req_type text not null,     -- skill/years/education/language/cert/keyword
  req_value text not null,
  weight numeric not null default 1,
  must_have boolean not null default false
);

-- Applications
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id),
  status public.application_status not null default 'submitted',
  created_at timestamptz not null default now(),
  unique(job_id, applicant_id)
);

-- Resumes
create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  storage_path text not null,        -- resumes/<applicant_id>/<job_id>/<application_id>/<filename>
  file_name text not null,
  mime_type text,
  text_extracted text,
  parsed_json jsonb,
  created_at timestamptz not null default now()
);

-- Embeddings (E5-small => 384 dims)
create table if not exists public.job_embeddings (
  job_id uuid primary key references public.jobs(id) on delete cascade,
  embedding vector(384) not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.resume_embeddings (
  resume_id uuid primary key references public.resumes(id) on delete cascade,
  embedding vector(384) not null,
  updated_at timestamptz not null default now()
);

-- Scores
create table if not exists public.scores (
  application_id uuid primary key references public.applications(id) on delete cascade,
  final_score numeric not null,
  breakdown jsonb not null,
  updated_at timestamptz not null default now()
);

-- Notifications (optional but useful)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Basic indexes (btree)
create index if not exists idx_jobs_company on public.jobs(company_id);
create index if not exists idx_jobs_status on public.jobs(status);
create index if not exists idx_applications_job on public.applications(job_id);
create index if not exists idx_applications_applicant on public.applications(applicant_id);
create index if not exists idx_resumes_application on public.resumes(application_id);
