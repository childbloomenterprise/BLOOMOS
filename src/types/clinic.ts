export type ClinicFactType = 'condition' | 'medication' | 'allergy';
export type ClinicFileType = 'image' | 'pdf' | 'document';
export type ClinicError = 'invalid' | 'expired' | 'revoked';

export interface ClinicPatient {
  fullName: string;
  dob: string;
  bloodType: string;
}

export interface ClinicFact {
  type: ClinicFactType;
  label: string;
  detail: string | null;
}

export interface ClinicReport {
  title: string;
  fileType: ClinicFileType;
  recordedAt: string | null;
  aiSummary: string | null;
  doctorQuestions: string[];
  signedUrl: string;
}

export interface ClinicRecord {
  patient: ClinicPatient;
  facts: ClinicFact[];
  reports: ClinicReport[];
  sharedAt: string;
  expiresAt: string;
  viewedCount: number;
}

export type ClinicRecordResult = ClinicRecord | { error: ClinicError };

export type ClinicViewState =
  | { kind: 'ready'; record: ClinicRecord }
  | { kind: 'unavailable'; error: ClinicError; title: string; message: string };

export interface ClinicAtAGlance {
  conditionCount: number;
  medicationCount: number;
  allergyCount: number;
  latestReportTitle: string;
  latestReportSummary: string;
  allergySummary: string;
}
