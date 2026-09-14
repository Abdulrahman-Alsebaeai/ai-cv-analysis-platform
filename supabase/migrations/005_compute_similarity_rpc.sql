-- RPC: compute_similarity(job_id, resume_id) -> similarity score
-- Uses cosine distance via pgvector operator <=> (cosine distance).
-- similarity = 1 - cosine_distance, clamped to [0,1].

create or replace function public.compute_similarity(
  p_job_id uuid,
  p_resume_id uuid
)
returns double precision
language plpgsql
stable
as $$
declare
  v_job vector(1536);
  v_res vector(1536);
  v_sim double precision;
begin
  select j.embedding into v_job
  from public.jobs j
  where j.id = p_job_id;

  select r.embedding into v_res
  from public.resumes r
  where r.id = p_resume_id;

  if v_job is null or v_res is null then
    return null;
  end if;

  -- cosine_distance = (v_job <=> v_res)
  -- cosine_similarity = 1 - cosine_distance
  v_sim := 1.0 - (v_job <=> v_res);

  -- clamp to [0, 1]
  if v_sim < 0 then v_sim := 0; end if;
  if v_sim > 1 then v_sim := 1; end if;

  return v_sim;
end;
$$;

grant execute on function public.compute_similarity(uuid, uuid) to anon, authenticated;
