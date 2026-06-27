-- 0007_share_trust.sql
-- Bloom OS — Cube: the PATIENT TRUST view. Let a signed-in patient see who viewed
-- each of their shares and when — their OWN access_log only.
--
-- access_log has RLS on with NO policies (service-role only), so a normal client
-- cannot read it. We expose just the owner's slice through a SECURITY DEFINER SQL
-- function that filters strictly on auth.uid(). search_path is pinned to public so
-- the definer's rights can't be hijacked via a mutable search path.
--
-- HOW TO RUN: Supabase dashboard -> SQL Editor -> New query -> paste -> Run.

create or replace function public.my_share_access_log()
returns table (
  share_id    uuid,
  token       text,
  created_at  timestamptz,
  expires_at  timestamptz,
  revoked     boolean,
  accessed_at timestamptz,
  viewer_ip   text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id          as share_id,
    s.token       as token,
    s.created_at  as created_at,
    s.expires_at  as expires_at,
    s.revoked     as revoked,
    a.accessed_at as accessed_at,
    a.viewer_ip   as viewer_ip
  from public.shares s
  join public.access_log a on a.share_id = s.id
  where s.user_id = auth.uid()   -- scope: ONLY the caller's own shares
  order by a.accessed_at desc;
$$;

-- Owner-only RPC: signed-in users may call it (it self-scopes by auth.uid());
-- anon may not. Revoke the default PUBLIC grant first, then grant to authenticated.
revoke execute on function public.my_share_access_log() from public, anon;
grant  execute on function public.my_share_access_log() to authenticated;
