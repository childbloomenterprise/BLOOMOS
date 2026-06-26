-- 0003_ai_on_records.sql
-- Bloom OS — Cube: persist the AI explanation on each health record.
--
-- Additive only (nothing dropped). After explain-report calls Claude, it writes
-- the result back onto the row (admin client) so the app + clinic view can show
-- it instantly without re-calling the AI.

alter table public.health_records
  add column if not exists ai_summary   text,
  add column if not exists ai_questions jsonb,
  add column if not exists ai_status    text
    check (ai_status in ('pending', 'done', 'error'))
    default 'pending';
