-- 0009_shares_owner_delete.sql
-- Bloom OS — Cube: let an owner DELETE their own shares.
--
-- Migration 0005 gave shares insert/select/update policies but NOT delete, so the
-- client (anon key, owner) could revoke a share but never remove it — which also
-- meant the demo reset could not zero out shares/access_log. This adds the missing
-- owner DELETE policy. access_log has FK ON DELETE CASCADE from shares, so deleting
-- a share also clears its view log. Owner-scoped: a user can only ever delete their
-- own shares (the clinic-record function still uses the service role and is
-- unaffected; access_log remains client-unreadable).
--
-- HOW TO RUN: Supabase dashboard -> SQL Editor -> New query -> paste -> Run.

create policy "Owner can delete their shares"
  on public.shares for delete
  using (auth.uid() = user_id);
