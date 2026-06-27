import assert from 'node:assert/strict';
import test from 'node:test';
import fixture from '../../contract/clinic-record.fixture.json';
import {
  formatExpiresIn,
  getClinicAtAGlance,
  getViewerHistoryLine,
  toClinicViewState,
} from './clinicRecord';
import type { ClinicRecord } from '../types/clinic';

test('valid clinic-record payload becomes ready state', () => {
  const state = toClinicViewState(fixture as ClinicRecord);

  assert.equal(state.kind, 'ready');
  if (state.kind === 'ready') {
    assert.equal(state.record.patient.fullName, 'Meera Nair');
    assert.equal(state.record.reports[0].doctorQuestions.length, 3);
  }
});

test('expired token payload becomes expired unavailable state', () => {
  const state = toClinicViewState({ error: 'expired' });

  assert.equal(state.kind, 'unavailable');
  if (state.kind === 'unavailable') {
    assert.equal(state.error, 'expired');
    assert.match(state.message, /ask the patient to share again/i);
  }
});

test('expiry label uses minutes for trust bar', () => {
  assert.equal(
    formatExpiresIn('2026-06-26T11:00:00Z', new Date('2026-06-26T10:00:00Z')),
    '60 min'
  );
});

test('at-a-glance summary is derived from contract fields', () => {
  const glance = getClinicAtAGlance(fixture as ClinicRecord);

  assert.equal(glance.conditionCount, 1);
  assert.equal(glance.medicationCount, 1);
  assert.equal(glance.allergyCount, 1);
  assert.equal(glance.latestReportTitle, 'HbA1c Panel');
  assert.match(glance.latestReportSummary, /Meera lives with Type 2 Diabetes/);
  assert.equal(glance.allergySummary, 'Penicillin');
});

test('viewer history line reflects viewed count', () => {
  assert.equal(
    getViewerHistoryLine(fixture as ClinicRecord),
    'Viewer history: 1 view; latest view 26 Jun 2026.'
  );
});

test('revoked token payload becomes revoked unavailable state', () => {
  const state = toClinicViewState({ error: 'revoked' });

  assert.equal(state.kind, 'unavailable');
  if (state.kind === 'unavailable') {
    assert.equal(state.error, 'revoked');
    assert.match(state.title, /revoked/i);
  }
});

test('rate-limited token payload becomes cooling-down unavailable state', () => {
  const state = toClinicViewState({ error: 'rate_limited' });

  assert.equal(state.kind, 'unavailable');
  if (state.kind === 'unavailable') {
    assert.equal(state.error, 'rate_limited');
    assert.match(state.message, /Too many recent views/i);
  }
});
