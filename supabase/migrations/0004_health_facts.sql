-- 0004_health_facts.sql
-- Bloom OS — Cube: structured health facts (conditions / medications / allergies)
-- for the patient profile + the clinic card.
--
-- HOW TO RUN: Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- Owner-only: a user can only read/write their own facts (RLS, like health_records).

create table if not exists public.health_facts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null check (type in ('condition', 'medication', 'allergy')),
  label       text not null,
  detail      text,
  created_at  timestamptz not null default now()
);

alter table public.health_facts enable row level security;

create policy "Owner can view their facts"
  on public.health_facts for select
  using (auth.uid() = user_id);

create policy "Owner can insert their facts"
  on public.health_facts for insert
  with check (auth.uid() = user_id);

create policy "Owner can update their facts"
  on public.health_facts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Owner can delete their facts"
  on public.health_facts for delete
  using (auth.uid() = user_id);
