-- Run in the Supabase SQL Editor. Client roles receive no new permissions.
grant select, insert, update, delete on table public.parishes to service_role;
grant select, insert, update, delete on table public.book_categories to service_role;
