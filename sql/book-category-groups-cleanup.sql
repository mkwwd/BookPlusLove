-- STEP 2, OPTIONAL: only after new production code is verified and the rollback
-- window is closed. Old clients/code cannot use this schema after cleanup.
-- Keep this file unexecuted during expansion/deployment. Leaving the legacy
-- column and triggers in place is supported.
begin;
set local lock_timeout = '5s';
-- Change no to yes ONLY when the deployment/rollback checks above are complete.
set local app.category_cleanup_confirmed = 'no';

do $$
begin
  if current_setting('app.category_cleanup_confirmed') <> 'yes' then
    raise exception 'Confirm the new production deployment and closed rollback window before cleanup.';
  end if;
end $$;

lock table public.book_categories in access exclusive mode;
lock table public.book_category_groups in access exclusive mode;

do $$
begin
  if exists (
    select 1 from public.book_categories c
    left join public.book_category_groups g on g.code = c.main_code
    where g.code is null or c.main_label is distinct from g.label
  ) then
    raise exception 'Category labels are not synchronized. Investigate before cleanup.';
  end if;
end $$;

drop trigger if exists category_compat_write_lock on public.book_categories;
drop trigger if exists category_compat_write_lock on public.book_category_groups;
drop function if exists public.lock_category_compat_write();
drop trigger if exists category_legacy_label on public.book_categories;
drop trigger if exists group_legacy_labels on public.book_category_groups;
drop function if exists public.sync_category_legacy_label();
drop function if exists public.sync_group_legacy_labels();
alter table public.book_categories drop column main_label;
notify pgrst, 'reload schema';
commit;
