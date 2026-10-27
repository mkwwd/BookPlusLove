-- Applies changes immediately: deploy the new code and take a fresh backup first.
-- Only ISO/Korean date formats change; invalid, blank and unknown values stay intact.
begin;
set local lock_timeout = '5s';

create or replace function pg_temp.format_publication_date(raw text)
returns text language plpgsql
set search_path = pg_catalog
as $$
declare
  parts text[];
begin
  parts := coalesce(
    regexp_match(btrim(raw), '^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$'),
    regexp_match(btrim(raw), '^(\d{4})\s*년(?:\s*(\d{1,2})\s*월(?:\s*(\d{1,2})\s*일)?)?$')
  );
  if parts is null then return raw; end if;

  -- Validate the calendar without adding unknown components to the result.
  perform make_date(
    parts[1]::integer,
    coalesce(parts[2]::integer, 1),
    coalesce(parts[3]::integer, 1)
  );

  return parts[1]
    || case when parts[2] is null then '' else '-' || lpad(parts[2], 2, '0') end
    || case when parts[3] is null then '' else '-' || lpad(parts[3], 2, '0') end;
exception when datetime_field_overflow then
  return raw;
end;
$$;

update public.books
set pub_date = pg_temp.format_publication_date(pub_date)
where pub_date is distinct from pg_temp.format_publication_date(pub_date)
returning id, title, pub_date;

commit;
