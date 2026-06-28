import clinicFixture from '../../contract/clinic-record.fixture.json';
import patientSummaryFixture from '../../contract/patient-summary.fixture.json';
import type { ClinicFact, ClinicPatient, ClinicRecord, ClinicReport } from '../types/clinic';

export interface PatientDemoState {
  patient: ClinicPatient;
  facts: ClinicFact[];
  reports: ClinicReport[];
  summary: string;
  summaryUpdatedAt: string;
  counts: {
    facts: number;
    reports: number;
    explainedReports: number;
    allergies: number;
  };
}

const clinicRecord = clinicFixture as ClinicRecord;

export const patientShareSteps = [
  'Create QR link',
  'Doctor requests access',
  'Patient approves',
  'Access expires',
];

export const patientDemoProof = {
  reportFileName: 'HbA1c Panel.pdf',
  readStatus: 'Report read',
  safetyLine: 'The AI explains, never diagnoses.',
};

export function getPatientDemoState(): PatientDemoState {
  const explainedReports = clinicRecord.reports.filter((report) => !!report.aiSummary);
  const allergies = clinicRecord.facts.filter((fact) => fact.type === 'allergy');

  return {
    patient: clinicRecord.patient,
    facts: clinicRecord.facts,
    reports: clinicRecord.reports,
    summary: patientSummaryFixture.summary ?? clinicRecord.summary ?? '',
    summaryUpdatedAt: patientSummaryFixture.summaryUpdatedAt,
    counts: {
      facts: clinicRecord.facts.length,
      reports: clinicRecord.reports.length,
      explainedReports: explainedReports.length,
      allergies: allergies.length,
    },
  };
}
