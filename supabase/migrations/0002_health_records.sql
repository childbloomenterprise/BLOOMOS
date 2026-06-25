-- 0002_health_records.sql
-- Bloom OS — Phase 1: health records table + private storage bucket
--
-- HOW TO RUN: Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- (Migration was already applied via MCP on 2026-06-25.)

create table if not exists public.health_records (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  notes       text,
  file_path   text not null,
  file_type   text not null check (file_type in ('image', 'pdf', 'document')),
  file_name   text not null,
  file_size   bigint,
  recorded_at date,
  created_at  timestamptz not null default now()
);

alter table public.health_records enable row level security;

create policy "Owner can view their records"
  on public.health_records for select
  using (auth.uid() = user_id);

create policy "Owner can insert their records"
  on public.health_records for insert
  with check (auth.uid() = user_id);

create policy "Owner can update their records"
  on public.health_records for update
  using (auth.uid() = user_id);

create policy "Owner can delete their records"
  on public.health_records for delete
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'health-docs',
  'health-docs',
  false,
  52428800,
  array[
    'image/jpeg','image/png','image/heic','image/webp','image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
on conflict (id) do nothing;

create policy "Owner can upload health files"
  on storage.objects for insert
  with check (
    bucket_id = 'health-docs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Owner can view health files"
  on storage.objects for select
  using (
    bucket_id = 'health-docs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Owner can delete health files"
  on storage.objects for delete
  using (
    bucket_id = 'health-docs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
