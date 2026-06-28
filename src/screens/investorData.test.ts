import assert from 'node:assert/strict';
import test from 'node:test';
import {
  architectureLoop,
  getInvestorProofSummary,
  investorOperatingModel,
  investorDemoRoutes,
  investorProofCards,
} from './investorData';

test('investor proof room covers patient, clinic, and hospital demos', () => {
  const summary = getInvestorProofSummary();

  assert.equal(summary.hasPatientWedge, true);
  assert.equal(summary.hasClinicHandoff, true);
  assert.equal(summary.hasHospitalExpansion, true);
  assert.equal(summary.demoCount, 3);
  assert.equal(summary.operatingModelCount, 4);
});

test('investor proof narrative has enough structured proof points', () => {
  assert.equal(investorProofCards.length, 4);
  assert.equal(architectureLoop.length, 5);
  assert.deepEqual(
    investorDemoRoutes.map((route) => route.label),
    ['Patient demo', 'Clinic handoff', 'Hospital OS']
  );
});

test('investor operating model shows the funding path', () => {
  assert.deepEqual(
    investorOperatingModel.map((item) => item.label),
    ['B2C entry', 'Clinic wedge', 'B2B expansion', 'Trust layer']
  );
});
