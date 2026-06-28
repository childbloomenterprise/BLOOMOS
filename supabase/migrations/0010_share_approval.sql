-- 0010_share_approval.sql
-- Bloom OS — the CONSENT GATE on shares.
--
-- Before this, a share token was instantly readable: anyone who scanned the QR
-- saw the record with no owner consent. Now a scan only REGISTERS A REQUEST; the
-- owner must APPROVE before the clinic-record function returns any data.
--
-- Status lifecycle:
--   pending   -> owner created the share, QR is shown, nobody has scanned yet
--   requested -> a device scanned; clinic-record (service role) flipped it here,
--                and the owner's laptop gets a live "Accept / Deny" popup
--   approved  -> owner accepted; clinic-record now returns the record on poll
--   denied    -> owner declined; clinic-record returns { error: 'denied' }
--
-- HOW TO RUN: applied via Supabase MCP (or dashboard -> SQL Editor -> paste -> Run).

alter table public.shares
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'requested', 'approved', 'denied')),
  add column if not exists requested_at    timestamptz,
  add column if not exists approved_at     timestamptz,
  -- A short, non-PII hint for the owner's popup, e.g. "Chrome on Windows".
  -- Derived server-side from the requester's User-Agent. Never trusted input.
  add column if not exists requester_label text;

-- The owner is signed in on their laptop and already has a SELECT policy on their
-- own shares (0005). Enabling Realtime lets that session receive a live event the
-- instant clinic-record flips status -> 'requested', so the Accept/Deny popup can
-- appear without polling. RLS still applies to Realtime: a user only ever receives
-- changes to rows they can SELECT (their own). No new anon policy is added — the
-- scanning doctor still never reads `shares` directly; everything anon goes through
-- the service-role clinic-record function.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'shares'
  ) then
    alter publication supabase_realtime add table public.shares;
  end if;
end $$;
