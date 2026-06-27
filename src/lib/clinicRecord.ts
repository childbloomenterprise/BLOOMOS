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
};

async function readClinicRecordFromFixture(token: string): Promise<ClinicRecordResult> {
  if (!token.trim()) {
    return { error: 'invalid' };
  }

  return fixture as ClinicRecord;
}

const readClinicRecordSource = readClinicRecordFromFixture;

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
    latestReportSummary: latestReport?.aiSummary ?? 'No plain-language summary available yet.',
    allergySummary:
      allergies.length > 0
        ? allergies.map((fact) => fact.label).join(', ')
        : 'No allergies listed',
  };
}

export function getViewerHistoryLine(record: ClinicRecord): string {
  const countLabel = record.viewedCount === 1 ? '1 view' : `${record.viewedCount} views`;
  return `Viewer history: ${countLabel} logged for this patient-shared link.`;
}
