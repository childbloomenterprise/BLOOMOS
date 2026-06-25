// src/lib/supabase.ts
//
// This is the single connection between the Bloom OS app and your Supabase
// backend (accounts, database, and later file storage). Everything that talks
// to the backend imports `supabase` from this one file.
//
// SECURITY: only the PUBLIC values live here — the project URL and the "anon"
// key. Both are safe to ship inside a phone app. The powerful `service_role`
// key and any AI keys are NEVER placed in the app; they live only in
// server-side Edge Functions (added in a later phase).

// This polyfill must be imported before the Supabase client is created so that
// URL handling works correctly inside React Native.
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// These come from your .env file. Expo automatically makes any variable that
// starts with EXPO_PUBLIC_ available here at build time — no extra setup.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Fail loudly and clearly if the .env values are missing, so we never get a
// confusing "network error" later. (This is a developer guardrail for you, V.)
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase config. Copy .env.example to .env and fill in ' +
      'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then restart Expo.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Remember the logged-in session on the phone between app restarts.
    storage: AsyncStorage,
    persistSession: true,
    // Quietly refresh the login token in the background so users don't get
    // logged out mid-session.
    autoRefreshToken: true,
    // On web: read the auth token from the URL after email confirmation redirects.
    // On native: not needed — deep links handle it differently.
    detectSessionInUrl: Platform.OS === 'web',
  },
});
