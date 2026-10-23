-- Remove accidental direct API access to Supabase's automatic RLS trigger function.
-- Event triggers continue to execute as their owner.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
-- The submit_cleaning() endpoint remains callable from shared devices in this
-- development build. It must be moved behind a rate-limited gateway before launch.
