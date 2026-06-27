export type FactType = 'condition' | 'medication' | 'allergy';

export interface HealthFact {
  id: string;
  user_id: string;
  type: FactType;
  label: string;
  detail: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  dob: string | null;        // YYYY-MM-DD
  blood_type: string | null;
  created_at: string;
  // The persisted at-a-glance handoff produced by the patient-summary function.
  summary: string | null;
  summary_updated_at: string | null;
}
