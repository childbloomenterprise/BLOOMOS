// src/lib/shares.ts
//
// A "share" is a time-limited, revocable token that lets a doctor open the
// patient's unified record at /clinic?token=... The token itself is generated
// server-side by the DB default (url-safe random) — the app never mints it.

import { supabase } from './supabase';

export interface Share {
  id: string;
  token: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  revoked: boolean;
}

const SHARE_TTL_MIN = 60;

export async function createShare(userId: string): Promise<Share> {
  const expiresAt = new Date(Date.now() + SHARE_TTL_MIN * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('shares')
    .insert({ user_id: userId, expires_at: expiresAt })
    .select()
    .single(); // token comes back from the DB default
  if (error) throw error;
  return data as Share;
}

export async function revokeShare(id: string): Promise<void> {
  const { error } = await supabase.from('shares').update({ revoked: true }).eq('id', id);
  if (error) throw error;
}
