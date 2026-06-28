// src/lib/shares.ts
//
// A "share" is a time-limited, revocable token that lets a doctor open the
// patient's unified record at /clinic?token=... The token itself is generated
// server-side by the DB default (url-safe random) — the app never mints it.
//
// A share is CONSENT-GATED: it is created `pending` and shows nothing until the
// owner approves. When a device scans the QR, the clinic-record function flips it
// to `requested` (which the owner's laptop sees live, via Realtime); the owner
// then approves/denies. Only `approved` shares ever return data.

import { supabase } from './supabase';

// Lifecycle: pending -> requested -> approved | denied. Mirrors the DB CHECK in
// migration 0010. `requested` is set server-side (service role); `approved`/`denied`
// are set by the owner via approveShare/denyShare below.
export type ShareStatus = 'pending' | 'requested' | 'approved' | 'denied';

export interface Share {
  id: string;
  token: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  revoked: boolean;
  status: ShareStatus;
  requested_at: string | null;
  approved_at: string | null;
  // Non-PII hint about the requesting device, e.g. "Chrome on Windows". Stamped
  // server-side from the User-Agent; safe to show in the Accept/Deny popup.
  requester_label: string | null;
}

const SHARE_TTL_MIN = 60;

export async function createShare(userId: string): Promise<Share> {
  const expiresAt = new Date(Date.now() + SHARE_TTL_MIN * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('shares')
    .insert({ user_id: userId, expires_at: expiresAt })
    .select()
    .single(); // token + status='pending' come back from the DB defaults
  if (error) throw error;
  return data as Share;
}

export async function revokeShare(id: string): Promise<void> {
  const { error } = await supabase.from('shares').update({ revoked: true }).eq('id', id);
  if (error) throw error;
}

// One-shot read of a single share the caller owns (RLS-scoped). Used as a polling
// backstop on the owner's screen in case Realtime is blocked.
export async function fetchShare(id: string): Promise<Share | null> {
  const { data, error } = await supabase.from('shares').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as Share) ?? null;
}

// Owner consents: the scanning device's poll now starts returning the record.
export async function approveShare(id: string): Promise<void> {
  const { error } = await supabase
    .from('shares')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// Owner declines: clinic-record returns { error: 'denied' } from now on. Terminal
// for this token — a new request needs a new share.
export async function denyShare(id: string): Promise<void> {
  const { error } = await supabase.from('shares').update({ status: 'denied' }).eq('id', id);
  if (error) throw error;
}

// Live updates for ONE share the owner is showing. RLS scopes Realtime to the
// caller's own rows (0005 SELECT policy), so this only ever fires for the owner's
// shares. Returns an unsubscribe function. `onChange` gets the full updated row —
// the laptop uses it to pop the Accept/Deny prompt the instant status -> requested.
export function subscribeToShare(shareId: string, onChange: (share: Share) => void): () => void {
  const channel = supabase
    .channel(`share:${shareId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'shares', filter: `id=eq.${shareId}` },
      (payload) => onChange(payload.new as Share),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
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
