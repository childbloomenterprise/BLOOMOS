import assert from 'node:assert/strict';
import test from 'node:test';
import { getPatientDemoState, patientDemoProof, patientShareSteps } from './patientDemoData';

test('patient demo is backed by contract fixtures', () => {
  const state = getPatientDemoState();

  assert.equal(state.patient.fullName, 'Meera Nair');
  assert.equal(state.patient.bloodType, 'B+');
  assert.equal(state.counts.facts, 3);
  assert.equal(state.counts.reports, 1);
});

test('patient demo exposes explained records and allergy safety', () => {
  const state = getPatientDemoState();

  assert.equal(state.counts.explainedReports, 1);
  assert.equal(state.counts.allergies, 1);
  assert.equal(state.reports[0].doctorQuestions.length, 3);
});

test('patient demo includes visible proof flow copy', () => {
  assert.deepEqual(patientShareSteps, [
    'Create QR link',
    'Doctor requests access',
    'Patient approves',
    'Access expires',
  ]);
  assert.equal(patientDemoProof.readStatus, 'Report read');
  assert.equal(patientDemoProof.safetyLine, 'The AI explains, never diagnoses.');
});
