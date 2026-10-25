-- STEP 1: Expand BEFORE deploying the new application. Back up the database first.
-- Keep main_label for the currently deployed application. Parent labels become
-- authoritative; temporary triggers maintain the legacy column for old readers.
-- Pause legacy category-management writes until the new application is deployed.
-- Do NOT run book-category-groups-cleanup.sql during this step.
begin;
set local lock_timeout = '5s';

lock table public.book_categories in access exclusive mode;

create table if not exists public.book_category_groups (
  code text primary key check (code ~ '^[0-9]{3}$'),
  label text not null check (char_length(btrim(label)) between 1 and 100)
);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'book_categories'
      and column_name = 'main_label'
  ) then
    if exists (
      select 1 from public.book_categories
      where main_code is null or main_code !~ '^[0-9]{3}$'
        or main_label is null or char_length(btrim(main_label)) not between 1 and 100
    ) then
      raise exception 'Invalid main_code/main_label in book_categories. Correct these values before retrying.';
    end if;

    if exists (
      select main_code from public.book_categories
      group by main_code having count(distinct main_label) > 1
    ) then
      raise exception 'A main_code has conflicting labels. Resolve them before retrying.';
    end if;

    if exists (
      select 1 from public.book_categories c
      join public.book_category_groups g on g.code = c.main_code
      where g.label <> c.main_label
    ) then
      raise exception 'Existing group labels conflict with book_categories. Resolve them before retrying.';
    end if;

    insert into public.book_category_groups (code, label)
      select distinct main_code, main_label from public.book_categories
      on conflict (code) do nothing;
  else
    raise exception 'main_label is missing. Cleanup may already be applied; do not rerun expansion after cleanup.';
  end if;
end $$;

alter table public.book_categories alter column main_code set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.book_categories'::regclass
      and conname = 'book_categories_main_code_group_fkey'
  ) then
    alter table public.book_categories
      add constraint book_categories_main_code_group_fkey
      foreign key (main_code) references public.book_category_groups(code)
      on update restrict on delete restrict;
  end if;
end $$;

create index if not exists book_categories_main_code_idx
  on public.book_categories (main_code);

alter table public.book_category_groups enable row level security;
revoke all on table public.book_category_groups from public, anon, authenticated;
grant select on table public.book_category_groups to anon, authenticated;
grant select, insert, update, delete on table public.book_category_groups to service_role;
grant select, insert, update, delete on table public.book_categories to service_role;
drop policy if exists book_category_groups_read on public.book_category_groups;
create policy book_category_groups_read on public.book_category_groups
  for select to anon, authenticated using (true);

-- ponytail: serialize infrequent catalog writes during compatibility; remove
-- this shared lock with cleanup rather than building a per-group lock manager.
-- Both statements take it before row locks, avoiding child/parent lock inversion.
create or replace function public.lock_category_compat_write()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(20261026, 1);
  return null;
end $$;

revoke all on function public.lock_category_compat_write() from public, anon, authenticated;
grant execute on function public.lock_category_compat_write() to service_role;

drop trigger if exists category_compat_write_lock on public.book_categories;
create trigger category_compat_write_lock
  before insert or update or delete on public.book_categories
  for each statement execute function public.lock_category_compat_write();
drop trigger if exists category_compat_write_lock on public.book_category_groups;
create trigger category_compat_write_lock
  before insert or update or delete on public.book_category_groups
  for each statement execute function public.lock_category_compat_write();

-- Lock the parent against concurrent renames so a child never stores an older
-- label after the rename's synchronization has completed. No privilege elevation.
create or replace function public.sync_category_legacy_label()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  select g.label into new.main_label
    from public.book_category_groups g where g.code = new.main_code
    for share;
  if not found then
    raise exception 'Unknown category group: %', new.main_code using errcode = '23503';
  end if;
  return new;
end $$;

create or replace function public.sync_group_legacy_labels()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  update public.book_categories set main_label = new.label
    where main_code = new.code and main_label is distinct from new.label;
  return new;
end $$;

revoke all on function public.sync_category_legacy_label() from public, anon, authenticated;
revoke all on function public.sync_group_legacy_labels() from public, anon, authenticated;
grant execute on function public.sync_category_legacy_label() to service_role;
grant execute on function public.sync_group_legacy_labels() to service_role;

drop trigger if exists category_legacy_label on public.book_categories;
create trigger category_legacy_label
  before insert or update on public.book_categories
  for each row execute function public.sync_category_legacy_label();

drop trigger if exists group_legacy_labels on public.book_category_groups;
create trigger group_legacy_labels
  after update of label on public.book_category_groups
  for each row when (old.label is distinct from new.label)
  execute function public.sync_group_legacy_labels();

notify pgrst, 'reload schema';
commit;
