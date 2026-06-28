export interface InvestorProofCard {
  eyebrow: string;
  title: string;
  body: string;
}

export interface InvestorDemoRoute {
  label: string;
  path: string;
  proof: string;
}

export interface InvestorOperatingModel {
  label: string;
  value: string;
  detail: string;
}

export const investorProofCards: InvestorProofCard[] = [
  {
    eyebrow: 'Wedge',
    title: 'Start with the patient record.',
    body: 'Families upload records because they need clarity today. That creates the consent-owned data layer hospitals need tomorrow.',
  },
  {
    eyebrow: 'Loop',
    title: 'Every explanation makes sharing better.',
    body: 'Reports become plain language, doctor questions, and reusable clinical context for the next handoff.',
  },
  {
    eyebrow: 'Moat',
    title: 'Consent and trust become infrastructure.',
    body: 'Short-lived links, revocation, viewer history, and patient approval turn Bloom OS into a trusted exchange layer.',
  },
  {
    eyebrow: 'Expansion',
    title: 'B2C utility opens B2B workflow.',
    body: 'The clinic view proves doctor value; the hospital command center shows how this scales into department operations.',
  },
];

export const investorDemoRoutes: InvestorDemoRoute[] = [
  {
    label: 'Patient demo',
    path: '/patient',
    proof: 'Fixture-backed B2C record, summary, facts, and handoff.',
  },
  {
    label: 'Clinic handoff',
    path: '/clinic?token=demo',
    proof: 'Doctor-ready read-only view from contract fixture.',
  },
  {
    label: 'Hospital OS',
    path: '/hospital',
    proof: 'B2B command center with department and patient worklists.',
  },
];

export const architectureLoop = [
  'Capture patient-owned records',
  'Explain clinical language safely',
  'Request and approve consent',
  'Open doctor handoff',
  'Audit access and revoke when done',
];

export const investorOperatingModel: InvestorOperatingModel[] = [
  {
    label: 'B2C entry',
    value: 'Patient record',
    detail: 'Families upload reports because they need clarity before the next appointment.',
  },
  {
    label: 'Clinic wedge',
    value: 'Doctor handoff',
    detail: 'Short-lived links make the patient record useful inside the doctor visit.',
  },
  {
    label: 'B2B expansion',
    value: 'Hospital OS',
    detail: 'Department worklists turn consented records into operational infrastructure.',
  },
  {
    label: 'Trust layer',
    value: 'Consent graph',
    detail: 'Viewer history, expiry, revocation, and clear AI boundaries become the moat.',
  },
];

export function getInvestorProofSummary() {
  return {
    proofCount: investorProofCards.length,
    demoCount: investorDemoRoutes.length,
    hasPatientWedge: investorDemoRoutes.some((route) => route.path === '/patient'),
    hasClinicHandoff: investorDemoRoutes.some((route) => route.path.startsWith('/clinic')),
    hasHospitalExpansion: investorDemoRoutes.some((route) => route.path === '/hospital'),
    operatingModelCount: investorOperatingModel.length,
  };
}
