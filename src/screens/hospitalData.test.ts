import assert from 'node:assert/strict';
import test from 'node:test';
import { getHospitalViewState } from './hospitalData';

test('hospital view state selects department queue and patient context', () => {
  const state = getHospitalViewState('cardiology');

  assert.equal(state.department.name, 'Cardiology');
  assert.equal(state.selectedPatient.name, 'Dev Kapoor');
  assert.equal(state.selectedPatient.allergy, 'Aspirin');
  assert.equal(state.activeHandoffs, 138);
});

test('hospital view state counts pending consent and allergy flags', () => {
  const state = getHospitalViewState('emergency');

  assert.equal(state.consentQueue, 3);
  assert.equal(state.allergyFlags, 5);
});
