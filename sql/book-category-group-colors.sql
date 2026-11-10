-- Run before deploying category-color editing. Existing readers remain compatible.
-- Re-running this script preserves every previously saved color.
begin;
set local lock_timeout = '5s';

alter table public.book_category_groups add column if not exists color text;

update public.book_category_groups
set color = case code
  when '000' then '#FFEA5E'
  when '100' then '#FA6728'
  when '200' then '#D6D5D4'
  when '300' then '#14A9FF'
  when '400' then '#0089D9'
  when '500' then '#78D44A'
  when '600' then '#FFB0B9'
  when '700' then '#FFCA45'
  when '800' then '#157300'
  when '900' then '#B88F53'
  else '#D6D5D4'
end
where color is null;

alter table public.book_category_groups
  alter column color set default '#D6D5D4',
  alter column color set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.book_category_groups'::regclass
      and conname = 'book_category_groups_color_hex_check'
  ) then
    alter table public.book_category_groups
      add constraint book_category_groups_color_hex_check
      check (color ~ '^#[0-9A-Fa-f]{6}$');
  end if;
end $$;

notify pgrst, 'reload schema';
commit;

select code, label, color from public.book_category_groups order by code;
