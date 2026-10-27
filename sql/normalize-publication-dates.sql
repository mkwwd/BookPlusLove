-- Preview by default. Deploy the new date-normalizing application and take a
-- fresh backup before changing 'no' to 'yes' and running this ENTIRE script.
begin;
set local lock_timeout = '5s';
set local app.publication_dates_apply = 'no';

-- Session-local helper only; no persistent schema or column type changes.
create or replace function pg_temp.normalize_publication_date(value text)
returns text language plpgsql immutable
set search_path = pg_catalog
as $$
declare
  cleaned text := regexp_replace(value, '^\s+|\s+$', '', 'g');
  parts text[];
  year_number integer;
  month_number integer;
  day_number integer;
begin
  if cleaned is null or cleaned = '' then return null; end if;
  parts := coalesce(
    regexp_match(cleaned, '^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$'),
    regexp_match(cleaned, '^(\d{4})\s*년(?:\s*(\d{1,2})\s*월(?:\s*(\d{1,2})\s*일)?)?$'),
    regexp_match(cleaned, '^(\d{4})\.(\d{1,2})(?:\.(\d{1,2}))?\.?$'),
    regexp_match(cleaned, '^(\d{4})/(\d{1,2})(?:/(\d{1,2}))?$'),
    regexp_match(cleaned, '^(\d{4})(\d{2})(\d{2})?$')
  );
  if parts is null then return null; end if;
  year_number := parts[1]::integer;
  month_number := parts[2]::integer;
  day_number := parts[3]::integer;
  -- Defaults are for validation only, never included in a partial date's result.
  perform make_date(year_number, coalesce(month_number, 1), coalesce(day_number, 1));
  return parts[1]
    || case when month_number is null then '' else '-' || lpad(parts[2], 2, '0') end
    || case when day_number is null then '' else '-' || lpad(parts[3], 2, '0') end;
exception when datetime_field_overflow then
  return null;
end;
$$;

create temporary table publication_date_plan on commit drop as
select id, title, pub_date as old_value,
       pg_temp.normalize_publication_date(pub_date) as new_value
from public.books;

-- No change to blanks or uncertain values; do not overwrite concurrent edits.
update public.books b
set pub_date = p.new_value
from publication_date_plan p
where current_setting('app.publication_dates_apply') = 'yes'
  and b.id = p.id
  and p.new_value is not null
  and p.new_value is distinct from p.old_value
  and b.pub_date is not distinct from p.old_value;

-- Inspect this result. In preview mode nothing is written to public.books.
select p.id, p.title, p.old_value, p.new_value,
  case
    when p.new_value is null then 'NEEDS_REVIEW_UNCHANGED'
    when current_setting('app.publication_dates_apply') <> 'yes' then 'PREVIEW_ONLY'
    when b.pub_date = p.new_value then 'NORMALIZED'
    else 'CONCURRENT_EDIT_SKIPPED'
  end as result
from publication_date_plan p
join public.books b on b.id = p.id
where (p.new_value is not null and p.new_value is distinct from p.old_value)
   or (p.new_value is null and p.old_value ~ '\S')
order by p.id;

commit;
