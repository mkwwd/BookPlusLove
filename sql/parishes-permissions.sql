-- Allow the server-side registration API to insert and return a parish.
grant select, insert on table public.parishes to service_role;
