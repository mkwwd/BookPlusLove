-- Apply after sql/notices.sql in the Supabase SQL Editor.
begin;
alter table public.notices add column if not exists is_pinned boolean not null default false;
alter table public.notices add column if not exists view_count bigint not null default 0;

grant select, insert, update, delete on public.notices to service_role;

create or replace function public.increment_notice_view(p_notice_id bigint)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_count bigint;
begin
  -- Atomic increment: simultaneous visitors do not overwrite one another.
  update public.notices set view_count = view_count + 1
    where id = p_notice_id and is_published = true
    returning view_count into current_count;
  return current_count;
end;
$$;
revoke all on function public.increment_notice_view(bigint) from public, anon, authenticated;
grant execute on function public.increment_notice_view(bigint) to service_role;
commit;
