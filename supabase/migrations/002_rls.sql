-- Enable RLS
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.job_requirements enable row level security;
alter table public.applications enable row level security;
alter table public.resumes enable row level security;
alter table public.job_embeddings enable row level security;
alter table public.resume_embeddings enable row level security;
alter table public.scores enable row level security;
alter table public.notifications enable row level security;

-- Helpers (inline via subqueries in policies)

-- Companies: readable by anyone (to show company names in job board)
drop policy if exists "companies_read_all" on public.companies;
create policy "companies_read_all"
on public.companies for select
using (true);

-- Companies: employer/admin manage their company
drop policy if exists "companies_manage" on public.companies;
create policy "companies_manage"
on public.companies for all
using (
  (select role from public.profiles where id = auth.uid()) in ('admin','employer')
  and (
    (select role from public.profiles where id = auth.uid()) = 'admin'
    or id = (select company_id from public.profiles where id = auth.uid())
  )
)
with check (
  (select role from public.profiles where id = auth.uid()) in ('admin','employer')
);

-- Profiles: user manages own profile
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

-- Jobs: anyone can read open jobs
drop policy if exists "jobs_read_open" on public.jobs;
create policy "jobs_read_open"
on public.jobs for select
using (status = 'open');

-- Jobs: employer/evaluator/admin can read their company jobs (open/closed/hidden)
drop policy if exists "jobs_read_company" on public.jobs;
create policy "jobs_read_company"
on public.jobs for select
using (
  (select role from public.profiles where id = auth.uid()) in ('admin','employer','evaluator')
  and company_id = (select company_id from public.profiles where id = auth.uid())
);

-- Jobs: employer/admin can insert jobs into their company
drop policy if exists "jobs_insert" on public.jobs;
create policy "jobs_insert"
on public.jobs for insert
with check (
  (select role from public.profiles where id = auth.uid()) in ('admin','employer')
  and company_id = (select company_id from public.profiles where id = auth.uid())
  and created_by = auth.uid()
);

-- Jobs: employer/admin can update/delete jobs in their company
drop policy if exists "jobs_update_delete" on public.jobs;
create policy "jobs_update_delete"
on public.jobs for update
using (
  (select role from public.profiles where id = auth.uid()) in ('admin','employer')
  and company_id = (select company_id from public.profiles where id = auth.uid())
)
with check (
  (select role from public.profiles where id = auth.uid()) in ('admin','employer')
  and company_id = (select company_id from public.profiles where id = auth.uid())
);

-- Requirements: read for open jobs + company staff
drop policy if exists "req_read_open_or_company" on public.job_requirements;
create policy "req_read_open_or_company"
on public.job_requirements for select
using (
  exists (select 1 from public.jobs j where j.id = job_requirements.job_id and j.status='open')
  or (
    (select role from public.profiles where id = auth.uid()) in ('admin','employer','evaluator')
    and exists (
      select 1 from public.jobs j
      where j.id = job_requirements.job_id
        and j.company_id = (select company_id from public.profiles where id = auth.uid())
    )
  )
);

-- Requirements: manage by employer/admin in their company
drop policy if exists "req_manage_company" on public.job_requirements;
create policy "req_manage_company"
on public.job_requirements for insert
with check (
  (select role from public.profiles where id = auth.uid()) in ('admin','employer')
  and exists (
    select 1 from public.jobs j
    where j.id = job_requirements.job_id
      and j.company_id = (select company_id from public.profiles where id = auth.uid())
  )
);

drop policy if exists "req_update_delete_company" on public.job_requirements;
create policy "req_update_delete_company"
on public.job_requirements for update
using (
  (select role from public.profiles where id = auth.uid()) in ('admin','employer')
  and exists (
    select 1 from public.jobs j
    where j.id = job_requirements.job_id
      and j.company_id = (select company_id from public.profiles where id = auth.uid())
  )
)
with check (true);

-- Applications: applicant reads own
drop policy if exists "applications_read_own" on public.applications;
create policy "applications_read_own"
on public.applications for select
using (applicant_id = auth.uid());

-- Applications: applicant can apply
drop policy if exists "applications_insert_own" on public.applications;
create policy "applications_insert_own"
on public.applications for insert
with check (applicant_id = auth.uid());

-- Applications: company staff reads applications for their jobs
drop policy if exists "applications_read_company" on public.applications;
create policy "applications_read_company"
on public.applications for select
using (
  (select role from public.profiles where id = auth.uid()) in ('admin','employer','evaluator')
  and exists (
    select 1 from public.jobs j
    where j.id = applications.job_id
      and j.company_id = (select company_id from public.profiles where id = auth.uid())
  )
);

-- Applications: company staff updates status
drop policy if exists "applications_update_status_company" on public.applications;
create policy "applications_update_status_company"
on public.applications for update
using (
  (select role from public.profiles where id = auth.uid()) in ('admin','employer','evaluator')
  and exists (
    select 1 from public.jobs j
    where j.id = applications.job_id
      and j.company_id = (select company_id from public.profiles where id = auth.uid())
  )
)
with check (true);

-- Resumes: applicant reads own resume via application
drop policy if exists "resumes_read_own" on public.resumes;
create policy "resumes_read_own"
on public.resumes for select
using (
  exists (
    select 1 from public.applications a
    where a.id = resumes.application_id
      and a.applicant_id = auth.uid()
  )
);

-- Resumes: applicant inserts resume for own application
drop policy if exists "resumes_insert_own" on public.resumes;
create policy "resumes_insert_own"
on public.resumes for insert
with check (
  exists (
    select 1 from public.applications a
    where a.id = resumes.application_id
      and a.applicant_id = auth.uid()
  )
);

-- Resumes: company staff reads resumes for their jobs
drop policy if exists "resumes_read_company" on public.resumes;
create policy "resumes_read_company"
on public.resumes for select
using (
  (select role from public.profiles where id = auth.uid()) in ('admin','employer','evaluator')
  and exists (
    select 1
    from public.applications a
    join public.jobs j on j.id = a.job_id
    where a.id = resumes.application_id
      and j.company_id = (select company_id from public.profiles where id = auth.uid())
  )
);

-- Scores: applicant reads own score
drop policy if exists "scores_read_own" on public.scores;
create policy "scores_read_own"
on public.scores for select
using (
  exists (
    select 1 from public.applications a
    where a.id = scores.application_id
      and a.applicant_id = auth.uid()
  )
);

-- Scores: company staff reads scores
drop policy if exists "scores_read_company" on public.scores;
create policy "scores_read_company"
on public.scores for select
using (
  (select role from public.profiles where id = auth.uid()) in ('admin','employer','evaluator')
  and exists (
    select 1
    from public.applications a
    join public.jobs j on j.id = a.job_id
    where a.id = scores.application_id
      and j.company_id = (select company_id from public.profiles where id = auth.uid())
  )
);

-- Embeddings tables: (عادة يكتبها السيرفر بمفتاح service_role، لكنه bypass RLS)
-- نسمح فقط بالقراءة لطاقم الشركة (اختياري)
drop policy if exists "job_embeddings_read_company" on public.job_embeddings;
create policy "job_embeddings_read_company"
on public.job_embeddings for select
using (
  (select role from public.profiles where id = auth.uid()) in ('admin','employer','evaluator')
);

drop policy if exists "resume_embeddings_read_company" on public.resume_embeddings;
create policy "resume_embeddings_read_company"
on public.resume_embeddings for select
using (
  (select role from public.profiles where id = auth.uid()) in ('admin','employer','evaluator')
);

-- Notifications: user reads own notifications
drop policy if exists "notifications_read_own" on public.notifications;
create policy "notifications_read_own"
on public.notifications for select
using (user_id = auth.uid());
