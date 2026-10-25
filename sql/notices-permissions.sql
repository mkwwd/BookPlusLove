-- Run in the Supabase SQL Editor. Client roles receive no new permissions.
grant select, insert, update, delete on table public.notices to service_role;
