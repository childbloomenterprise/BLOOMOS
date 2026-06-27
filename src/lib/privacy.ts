// src/lib/privacy.ts
//
// Privacy IS the product. Two owner-only Edge Functions back these wrappers:
//   • export-data    — returns the caller's full record as one JSON bundle.
//   • delete-account — irreversibly deletes the caller's account + all data.
// Both verify the caller from their JWT server-side; neither trusts a client id.

import { supabase } from './supabase';
import type { FactType } from '../types/facts';

export interface ExportedRecord {
  title: string;
  notes: string | null;
  file_type: string;
  file_name: string;
  file_size: number | null;
  recorded_at: string | null;
  ai_summary: string | null;
  ai_questions: string[] | null;
  ai_status: string | null;
  created_at: string;
  signedUrl: string | null;
}

export interface ExportBundle {
  exportedAt: string;
  account: { id: string; email: string | null };
  profile: {
    full_name: string | null;
    dob: string | null;
    blood_type: string | null;
    summary: string | null;
    summary_updated_at: string | null;
    created_at: string;
  } | null;
  facts: { type: FactType; label: string; detail: string | null; created_at: string }[];
  records: ExportedRecord[];
}

function unwrap<T>(data: unknown, error: unknown): T {
  if (error) throw error;
  if (data && typeof data === 'object' && 'error' in data && (data as { error?: unknown }).error) {
    throw new Error(String((data as { error: unknown }).error));
  }
  return data as T;
}

// Download everything the signed-in user owns as one JSON document.
export async function exportData(): Promise<ExportBundle> {
  const { data, error } = await supabase.functions.invoke('export-data', { body: {} });
  return unwrap<ExportBundle>(data, error);
}

// Irreversibly delete the signed-in user's account and all their data. Requires
// explicit confirmation (the server enforces it too). After this resolves the
// session is dead — the caller should sign out / return to the landing screen.
export async function deleteAccount(): Promise<void> {
  const { data, error } = await supabase.functions.invoke('delete-account', {
    body: { confirm: true },
  });
  unwrap<{ ok: true }>(data, error);
}
