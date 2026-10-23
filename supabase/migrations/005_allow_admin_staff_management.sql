-- Admins can manage the staff directory, but cleaning evidence remains immutable.
-- 'admin employees' RLS policy already restricts ALL writes to listed administrators.
grant insert, update on table public.employees to authenticated;
revoke delete on table public.employees from anon, authenticated;
