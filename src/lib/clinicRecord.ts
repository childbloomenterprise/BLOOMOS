import fixture from '../../contract/clinic-record.fixture.json';
import type {
  ClinicAtAGlance,
  ClinicError,
  ClinicRecord,
  ClinicRecordResult,
  ClinicViewState,
} from '../types/clinic';

const unavailableCopy: Record<ClinicError, { title: string; message: string }> = {
  invalid: {
    title: 'This share link is not valid',
    message: 'Ask the patient to share their record again.',
  },
  expired: {
    title: 'This link has expired',
    message: 'This link has expired — ask the patient to share again.',
  },
  revoked: {
    title: 'This share link was revoked',
    message: 'Ask the patient to share their record again.',
  },
  rate_limited: {
    title: 'This share link is cooling down',
    message: 'Too many recent views. Wait a moment, then ask the patient to share again if needed.',
  },
};

async function readClinicRecordFromFixture(token: string): Promise<ClinicRecordResult> {
  if (!token.trim()) {
    return { error: 'invalid' };
  }

  return fixture as ClinicRecord;
}

const CLINIC_ERRORS: ClinicError[] = ['invalid', 'expired', 'revoked', 'rate_limited'];

function isClinicError(value: unknown): value is ClinicError {
  return typeof value === 'string' && (CLINIC_ERRORS as string[]).includes(value);
}

// Live path: call the token-gated clinic-record Edge Function. The TOKEN is the
// auth (verify_jwt = false), so no session is required — the doctor opens the QR
// link with no login. The function validates/logs server-side and returns either
// the unified record or { error } (always HTTP 200, so the client parses the body).
async function readClinicRecordFromFunction(token: string): Promise<ClinicRecordResult> {
  if (!token.trim()) {
    return { error: 'invalid' };
  }

  try {
    // Imported lazily so this module's static graph stays free of React Native
    // deps — that keeps the pure helpers unit-testable under plain node (tsx).
    const { supabase } = await import('./supabase');
    const { data, error } = await supabase.functions.invoke('clinic-record', {
      body: { token },
    });

    // Transport / non-2xx failure (the function itself returns 200 even for
    // invalid/expired/revoked), or an empty body → treat as an invalid link.
    if (error || !data) {
      return { error: 'invalid' };
    }

    if (isClinicError((data as { error?: unknown }).error)) {
      return { error: (data as { error: ClinicError }).error };
    }

    return data as ClinicRecord;
  } catch {
    return { error: 'invalid' };
  }
}

// Seam: set EXPO_PUBLIC_USE_FIXTURES=1 for offline/UI development against the
// static fixture. The default (unset) hits the LIVE function — that is what makes
// revoke, access-logging, and viewer history real in the demo.
const useFixtures = process.env.EXPO_PUBLIC_USE_FIXTURES === '1';
const readClinicRecordSource = useFixtures
  ? readClinicRecordFromFixture
  : readClinicRecordFromFunction;

export async function readClinicRecord(token: string | null): Promise<ClinicRecordResult> {
  return readClinicRecordSource(token ?? '');
}

export function toClinicViewState(result: ClinicRecordResult): ClinicViewState {
  if ('error' in result) {
    return {
      kind: 'unavailable',
      error: result.error,
      ...unavailableCopy[result.error],
    };
  }

  return { kind: 'ready', record: result };
}

export function formatDateLabel(value: string | null): string {
  if (!value) return 'Not dated';
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDob(value: string): string {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatExpiresIn(expiresAt: string, now = new Date(), sharedAt?: string): string {
  let minutes = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 60000));

  if (minutes === 0 && sharedAt) {
    minutes = Math.max(
      0,
      Math.ceil((new Date(expiresAt).getTime() - new Date(sharedAt).getTime()) / 60000)
    );
  }

  if (minutes <= 60) {
    return `${minutes} min`;
  }

  const hours = Math.ceil(minutes / 60);
  return `${hours} hr`;
}

export function getClinicAtAGlance(record: ClinicRecord): ClinicAtAGlance {
  const conditions = record.facts.filter((fact) => fact.type === 'condition');
  const medications = record.facts.filter((fact) => fact.type === 'medication');
  const allergies = record.facts.filter((fact) => fact.type === 'allergy');
  const latestReport = record.reports[0];

  return {
    conditionCount: conditions.length,
    medicationCount: medications.length,
    allergyCount: allergies.length,
    latestReportTitle: latestReport?.title ?? 'No reports shared',
    latestReportSummary:
      record.summary ?? latestReport?.aiSummary ?? 'No plain-language summary available yet.',
    allergySummary:
      allergies.length > 0
        ? allergies.map((fact) => fact.label).join(', ')
        : 'No allergies listed',
  };
}

export function getViewerHistoryLine(record: ClinicRecord): string {
  const countLabel = record.viewedCount === 1 ? '1 view' : `${record.viewedCount} views`;
  const latestView = record.viewerEvents[0];

  if (!latestView) {
    return `Viewer history: ${countLabel} logged for this patient-shared link.`;
  }

  return `Viewer history: ${countLabel}; latest view ${formatDateLabel(latestView)}.`;
}
