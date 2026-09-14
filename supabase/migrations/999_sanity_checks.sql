-- Quick checks (won't fail migrations; just for visibility if you run manually).

-- Check function exists
select proname
from pg_proc
join pg_namespace n on n.oid = pg_proc.pronamespace
where n.nspname = 'public'
  and proname = 'compute_similarity';

-- Check columns exist
select table_name, column_name, data_type
from information_schema.columns
where table_schema='public'
  and table_name in ('jobs','resumes','applications')
order by table_name, column_name;
