-- 0008_lock_down_handle_new_user.sql
-- Bloom OS — Cube: security hardening from the Supabase advisors.
--
-- handle_new_user() is the signup TRIGGER function (SECURITY DEFINER, migration
-- 0001). It must only ever fire from the on_auth_user_created trigger — it is NOT
-- meant to be a callable RPC. By default Postgres grants EXECUTE on new functions
-- to PUBLIC, which is why the advisor flags it as runnable by anon/authenticated
-- via /rest/v1/rpc/handle_new_user. Revoking EXECUTE removes the RPC surface
-- without affecting the trigger (triggers run as the table owner, not the caller).
--
-- Clears advisors:
--   anon_security_definer_function_executable (handle_new_user)
--   authenticated_security_definer_function_executable (handle_new_user)
--
-- HOW TO RUN: Supabase dashboard -> SQL Editor -> New query -> paste -> Run.

revoke execute on function public.handle_new_user() from public, anon, authenticated;
