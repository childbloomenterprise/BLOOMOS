# Bloom OS — B2C app (Phase 1)

The private mobile app where your health lives, owned by you.
**Store → Understand → Share.** Phase 1 adds health record uploads — photos, scans, and documents stored in a private encrypted bucket that only you can access.

Built with **Expo (React Native + TypeScript)**, **Supabase** (auth + database + storage), and deployable to **Vercel** (web).

---

## What's in here

```
App.tsx                               Root navigator (screen state machine)
src/lib/supabase.ts                   Supabase connection (reads .env)
src/lib/storage.ts                    Upload/download helpers for health-docs bucket
src/context/AuthContext.tsx           Auth state
src/screens/AuthScreen.tsx            Sign Up / Log In
src/screens/HomeScreen.tsx            Records dashboard + FAB
src/screens/UploadScreen.tsx          Pick file → add metadata → upload
src/screens/RecordDetailScreen.tsx    View record + signed URL + delete
src/types/health.ts                   TypeScript types for HealthRecord
supabase/migrations/
  0001_init_profiles.sql              profiles table + RLS + auto-create trigger
  0002_health_records.sql             health_records table + storage bucket + RLS
vercel.json                           Expo web build config for Vercel
.env.example                          Template for your Supabase keys
```

---

## Run it on your phone

You need [Node.js](https://nodejs.org) and **Expo Go** on your phone.

**1. Copy the env template and fill in your keys.**
```bash
cp .env.example .env
```
Open `.env` and paste your Supabase **anon public** key
(Dashboard → Project Settings → API). The URL is already set.

**2. Install and start.**
```bash
npm install
npx expo start
```
Scan the QR code with Expo Go (iPhone: Camera app; Android: inside Expo Go).

> Changed `.env`? Restart with `npx expo start -c` to clear Expo's cache.

---

## Vercel web deployment

The app is also deployable as a web app via Vercel. After connecting this repo to Vercel:

1. In your Vercel project → **Settings → Environment Variables**, add:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
2. Vercel will auto-build on every push using `vercel.json`.

---

## Security

- Only the **anon key** + project URL are in the app — safe to ship.
- **`service_role`** key and AI keys are server-side only — never here.
- **RLS is ON** for every table and the storage bucket: users can only access their own data.
- Health files are stored in a **private bucket** (`health-docs`) — no public URLs, signed URLs only, 1-hour expiry.
- `.env` is gitignored — secrets are never committed.
