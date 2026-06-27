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

// One row per (share × view). The patient trust view: who viewed each of the
// caller's shares, and when.
export interface ShareView {
  share_id: string;
  token: string;
  created_at: string;
  expires_at: string;
  revoked: boolean;
  accessed_at: string;
  viewer_ip: string | null;
}

// Powers the "who has seen my record" trust screen. Backed by the
// my_share_access_log() SECURITY DEFINER RPC, which self-scopes to auth.uid() —
// a signed-in user only ever sees their OWN shares' access log (access_log itself
// has RLS on with no client policies). Rows come back newest-first.
export async function listShareViews(): Promise<ShareView[]> {
  const { data, error } = await supabase.rpc('my_share_access_log');
  if (error) throw error;
  return (data ?? []) as ShareView[];
}
