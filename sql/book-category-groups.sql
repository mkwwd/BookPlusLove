-- Apply together with the category hierarchy application release.
-- Back up book_categories first. This transaction preserves category codes and
-- books.category_code; only the duplicated main_label column is removed.
-- Conflicting/missing parent data aborts the entire migration for manual review.
begin;

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
drop policy if exists book_category_groups_read on public.book_category_groups;
create policy book_category_groups_read on public.book_category_groups
  for select to anon, authenticated using (true);

alter table public.book_categories drop column if exists main_label;
notify pgrst, 'reload schema';
commit;
