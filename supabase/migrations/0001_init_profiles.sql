-- 0001_init_profiles.sql
-- Bloom OS — Phase 0: profiles table + Row-Level Security + auto-create-on-signup
--
-- HOW TO RUN: open your Supabase dashboard -> SQL Editor -> New query,
-- paste this whole file, and click Run. You should see "Success".

-- 1. One profile row per user, linked to Supabase's built-in auth.users table.
--    "on delete cascade" means if the account is deleted, the profile goes too.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  dob         date,
  blood_type  text,
  created_at  timestamptz not null default now()
);

-- 2. Turn ON Row-Level Security. With this on, rows are private by default:
--    nobody can read or write anything until a policy below explicitly allows it.
alter table public.profiles enable row level security;

-- 3. The policies: a logged-in user can only read / insert / update their OWN
--    row. auth.uid() is the id of whoever is making the request.
create policy "Owner can view their profile"
  on public.profiles for select
  using ( auth.uid() = id );

create policy "Owner can insert their profile"
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Owner can update their profile"
  on public.profiles for update
  using ( auth.uid() = id )
  with check ( auth.uid() = id );

-- 4. Automatically create a profile row the moment a new user signs up.
--    "security definer" lets this trusted function insert past Row-Level
--    Security (the new user isn't "logged in" yet at signup time).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

-- Re-create the trigger cleanly (safe to run this file more than once).
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
