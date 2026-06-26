-- 0005_shares.sql
-- Bloom OS — Cube: the SHARE half. A patient creates a time-limited share token;
-- the doctor opens /clinic?token=... and the clinic-record function (service role)
-- validates the token and logs every view.
--
-- HOW TO RUN: Supabase dashboard -> SQL Editor -> New query -> paste -> Run.

-- gen_random_bytes() lives in pgcrypto. Used to mint a URL-safe random token in
-- the DB so the app never needs a client-side crypto polyfill.
create extension if not exists pgcrypto;

create table if not exists public.shares (
  id          uuid primary key default gen_random_uuid(),
  -- URL-safe base64 token (no + / =) generated server-side on insert.
  token       text unique not null
                default translate(encode(gen_random_bytes(18), 'base64'), '+/=', '-_'),
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  revoked     boolean not null default false
);

alter table public.shares enable row level security;

-- Owner can create a share for themselves. token/created_at come from defaults.
create policy "Owner can create their shares"
  on public.shares for insert
  with check (auth.uid() = user_id);

-- Owner can see their own shares (to show the QR / status).
create policy "Owner can view their shares"
  on public.shares for select
  using (auth.uid() = user_id);

-- Owner can update their own shares (only used to set revoked = true).
create policy "Owner can update their shares"
  on public.shares for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
-- NOTE: there is deliberately NO public/anon read policy on shares. The token is
-- validated only inside the clinic-record Edge Function using the service role.

create table if not exists public.access_log (
  id          uuid primary key default gen_random_uuid(),
  share_id    uuid not null references public.shares(id) on delete cascade,
  accessed_at timestamptz not null default now(),
  viewer_ip   text
);

-- RLS on, but NO policies at all: no client (anon or authed) can read or write
-- access_log. Only the clinic-record function (service role) touches it.
alter table public.access_log enable row level security;
