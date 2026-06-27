-- 0006_profile_summary.sql
-- Bloom OS — Cube: persist the at-a-glance clinical handoff on the profile.
--
-- The patient-summary Edge Function synthesizes the user's health_facts + the
-- already-persisted ai_summary fields on health_records into 3–5 calm sentences,
-- then writes the result here so the app + clinic view load it instantly without
-- re-calling Claude. Additive only (nothing dropped).
--
-- HOW TO RUN: Supabase dashboard -> SQL Editor -> New query -> paste -> Run.

alter table public.profiles
  add column if not exists summary            text,
  add column if not exists summary_updated_at timestamptz;

-- No new policies needed: the existing "Owner can view/update their profile"
-- RLS policies already cover these columns. patient-summary writes them with the
-- service role (like explain-report writes ai_summary onto health_records).
