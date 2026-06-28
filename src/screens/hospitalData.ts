export type DepartmentId = 'emergency' | 'endocrinology' | 'cardiology' | 'radiology';

export interface HospitalDepartment {
  id: DepartmentId;
  name: string;
  handoffs: string;
  status: string;
  accent: 'danger' | 'primary' | 'gold' | 'dark';
}

export interface HospitalPatient {
  id: string;
  name: string;
  meta: string;
  consent: 'Approved' | 'Requested' | 'Pending';
  condition: string;
  medication: string;
  allergy: string;
  summary: string;
}

export interface HospitalViewState {
  department: HospitalDepartment;
  patients: HospitalPatient[];
  selectedPatient: HospitalPatient;
  consentQueue: number;
  activeHandoffs: number;
  allergyFlags: number;
}

export const hospitalDepartments: HospitalDepartment[] = [
  { id: 'emergency', name: 'Emergency', handoffs: '58', status: 'High intake', accent: 'danger' },
  { id: 'endocrinology', name: 'Endocrinology', handoffs: '34', status: 'Diabetes follow-ups', accent: 'primary' },
  { id: 'cardiology', name: 'Cardiology', handoffs: '27', status: 'Reports reconciled', accent: 'gold' },
  { id: 'radiology', name: 'Radiology', handoffs: '19', status: 'Files ready', accent: 'dark' },
];

export const hospitalPatients: Record<DepartmentId, HospitalPatient[]> = {
  emergency: [
    {
      id: 'meera',
      name: 'Meera Nair',
      meta: 'B+ - DOB 14 March 1989 - patient-approved',
      consent: 'Approved',
      condition: 'Type 2 Diabetes',
      medication: 'Metformin 500mg',
      allergy: 'Penicillin',
      summary: 'HbA1c is a little above the common goal. Review target, medication, and retest timing alongside the full clinical picture.',
    },
    {
      id: 'arjun',
      name: 'Arjun Rao',
      meta: 'O+ - DOB 22 August 1978 - consent requested',
      consent: 'Requested',
      condition: 'Hypertension',
      medication: 'Amlodipine 5mg',
      allergy: 'None listed',
      summary: 'Recent blood pressure readings need reconciliation with medication history before discharge planning.',
    },
  ],
  endocrinology: [
    {
      id: 'meera-endo',
      name: 'Meera Nair',
      meta: 'B+ - DOB 14 March 1989 - patient-approved',
      consent: 'Approved',
      condition: 'Type 2 Diabetes',
      medication: 'Metformin 500mg',
      allergy: 'Penicillin',
      summary: 'Glucose trend and HbA1c are ready for specialist review with medication and allergy context attached.',
    },
    {
      id: 'sara',
      name: 'Sara Menon',
      meta: 'A- - DOB 2 February 1995 - consent pending',
      consent: 'Pending',
      condition: 'Hypothyroidism',
      medication: 'Levothyroxine 75mcg',
      allergy: 'Sulfa',
      summary: 'Thyroid report is ready for review once the patient approves the department handoff.',
    },
  ],
  cardiology: [
    {
      id: 'dev',
      name: 'Dev Kapoor',
      meta: 'AB+ - DOB 9 May 1966 - patient-approved',
      consent: 'Approved',
      condition: 'Coronary artery disease',
      medication: 'Atorvastatin 20mg',
      allergy: 'Aspirin',
      summary: 'Cardiology packet highlights prior procedure notes, lipid panel trend, and aspirin allergy.',
    },
  ],
  radiology: [
    {
      id: 'lina',
      name: 'Lina Shah',
      meta: 'O- - DOB 17 July 1983 - consent requested',
      consent: 'Requested',
      condition: 'Post-op follow-up',
      medication: 'Ibuprofen as needed',
      allergy: 'Contrast dye',
      summary: 'Imaging files are staged with contrast allergy and operative context visible before review.',
    },
  ],
};

export function getHospitalViewState(departmentId: DepartmentId): HospitalViewState {
  const department =
    hospitalDepartments.find((item) => item.id === departmentId) ?? hospitalDepartments[0];
  const patients = hospitalPatients[department.id];
  const allPatients = Object.values(hospitalPatients).flat();

  return {
    department,
    patients,
    selectedPatient: patients[0],
    consentQueue: allPatients.filter((patient) => patient.consent !== 'Approved').length,
    activeHandoffs: hospitalDepartments.reduce((sum, item) => sum + Number(item.handoffs), 0),
    allergyFlags: allPatients.filter((patient) => patient.allergy !== 'None listed').length,
  };
}
