// src/lib/summary.ts
//
// The "at-a-glance" clinical handoff. The patient-summary Edge Function
// (verify_jwt: true) synthesizes the user's health_facts + the already-persisted
// ai_summary fields on health_records into 3–5 calm sentences, then PERSISTS the
// result onto profiles.summary / summary_updated_at. Same never-diagnose guardrail
// as explain-report.
//
// Two seams, on purpose:
//   • getPatientSummary()        — cheap READ of the persisted row (no AI call).
//   • regeneratePatientSummary() — invokes the function (one AI call + persist).
//     Call it after facts/records change so the handoff stays current. The clinic
//     view reads the persisted summary via clinic-record; it never regenerates.

import { supabase } from './supabase';

export interface PatientSummary {
  summary: string | null;
  summaryUpdatedAt: string | null;
}

// Read the persisted handoff for display in the app. No AI call, no cost.
export async function getPatientSummary(userId: string): Promise<PatientSummary> {
  const { data, error } = await supabase
    .from('profiles')
    .select('summary, summary_updated_at')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return {
    summary: data?.summary ?? null,
    summaryUpdatedAt: data?.summary_updated_at ?? null,
  };
}

// Regenerate the handoff (one Claude call) and persist it. Returns the fresh text.
export async function regeneratePatientSummary(): Promise<PatientSummary> {
  const { data, error } = await supabase.functions.invoke('patient-summary', { body: {} });
  if (error) throw error;
  return {
    summary: (data?.summary as string | null) ?? null,
    summaryUpdatedAt: (data?.summaryUpdatedAt as string | null) ?? null,
  };
}

// Fire-and-forget refresh: call after a fact/record changes so the at-a-glance
// stays current. Never throws — a non-critical summary refresh must not break the
// user's actual action (adding a fact, explaining a report).
export function refreshPatientSummaryInBackground(): void {
  void regeneratePatientSummary().catch(() => {
    // best-effort; the summary regenerates on the next change or manual refresh
  });
}
