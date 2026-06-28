import React, { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { bloom } from '../../contract/tokens';
import {
  BloomMark,
  Card,
  Disclaimer,
  FadeIn,
  GradientPanel,
  MetricTile,
  StatusPill,
} from '../components/Bloom';
import {
  getHospitalViewState,
  hospitalDepartments,
  type DepartmentId,
  type HospitalDepartment,
  type HospitalPatient,
} from './hospitalData';

const timeline = [
  'Patient shares record',
  'Hospital requests consent',
  'Bloom OS assembles facts, reports, allergies, and summaries',
  'Doctor opens clinical view',
  'Audit trail updates automatically',
];

function accentColor(department: HospitalDepartment): string {
  if (department.accent === 'danger') return bloom.danger;
  if (department.accent === 'gold') return bloom.gold;
  if (department.accent === 'dark') return bloom.primaryDark;
  return bloom.primary;
}

function consentTone(patient: HospitalPatient): 'mint' | 'gold' | 'danger' {
  if (patient.consent === 'Approved') return 'gold';
  if (patient.consent === 'Requested') return 'mint';
  return 'danger';
}

export default function HospitalScreen() {
  const { width } = useWindowDimensions();
  const compact = width < 800;
  const [departmentId, setDepartmentId] = useState<DepartmentId>('emergency');
  const [patientId, setPatientId] = useState<string | null>(null);
  const viewState = useMemo(() => getHospitalViewState(departmentId), [departmentId]);
  const selectedPatient =
    viewState.patients.find((patient) => patient.id === patientId) ?? viewState.selectedPatient;
  const workstreams = [
    {
      label: 'Consent queue',
      value: viewState.consentQueue,
      detail: 'patient approvals waiting',
      tone: 'gold' as const,
    },
    {
      label: 'Clinic handoffs',
      value: viewState.activeHandoffs,
      detail: 'active read-only views',
      tone: 'mint' as const,
    },
    {
      label: 'Allergy flags',
      value: viewState.allergyFlags,
      detail: 'must-review alerts',
      tone: 'danger' as const,
    },
  ];

  function goHome() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }

  function openClinicDemo() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = '/clinic?token=demo';
    }
  }

  function openInvestorRoom() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = '/investor';
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <FadeIn style={styles.page}>
        <View style={styles.nav}>
          <View style={styles.brandLockup}>
            <BloomMark />
            <View>
              <Text style={styles.brand}>Bloom OS</Text>
              <Text style={styles.navSub}>Hospital command center preview</Text>
            </View>
          </View>
          <View style={styles.navActions}>
            <Pressable accessibilityRole="button" onPress={openInvestorRoom} style={styles.navGhost}>
              <Text style={styles.navGhostText}>Investor proof</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={openClinicDemo} style={styles.navGhost}>
              <Text style={styles.navGhostText}>Clinic handoff</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={goHome} style={styles.navCta}>
              <Text style={styles.navCtaText}>Back to vision</Text>
            </Pressable>
          </View>
        </View>

        <GradientPanel style={[styles.hero, compact && styles.heroCompact]}>
          <View style={styles.heroCopy}>
            <StatusPill label="2035 hospital OS simulation" tone="dark" />
            <Text style={styles.heroTitle}>
              The hospital database becomes a consent-aware care graph.
            </Text>
            <Text style={styles.heroBody}>
              Bloom OS connects patient-owned records, clinician-ready summaries,
              department workflows, and audit trails into one calm operating surface.
            </Text>
          </View>
          <Card style={styles.commandCard}>
            <Text style={styles.commandLabel}>Network state</Text>
            <Text style={styles.commandTitle}>Northstar Hospital Network</Text>
            <View style={styles.metricGrid}>
              {workstreams.map((item) => (
                <MetricTile
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  caption={item.detail}
                  tone={item.tone}
                />
              ))}
            </View>
          </Card>
        </GradientPanel>

        <View style={styles.grid}>
          <Card style={styles.panelLarge}>
            <View style={styles.panelHeader}>
              <View>
                <Text style={styles.panelEyebrow}>Care graph</Text>
                <Text style={styles.panelTitle}>Every handoff starts with context.</Text>
              </View>
              <StatusPill label="Live preview" />
            </View>
            <View style={styles.patientRow}>
              <View style={styles.patientIdentity}>
                <Text style={styles.patientName}>{selectedPatient.name}</Text>
                <Text style={styles.patientMeta}>{selectedPatient.meta}</Text>
              </View>
              <StatusPill label={`Consent ${selectedPatient.consent}`} tone={consentTone(selectedPatient)} />
            </View>
            <View style={styles.factRow}>
              <View style={styles.factBox}>
                <Text style={styles.factLabel}>Condition</Text>
                <Text style={styles.factValue}>{selectedPatient.condition}</Text>
              </View>
              <View style={styles.factBox}>
                <Text style={styles.factLabel}>Medication</Text>
                <Text style={styles.factValue}>{selectedPatient.medication}</Text>
              </View>
              <View style={[styles.factBox, selectedPatient.allergy !== 'None listed' && styles.factBoxDanger]}>
                <Text style={[styles.factLabel, selectedPatient.allergy !== 'None listed' && styles.factDanger]}>
                  Allergy
                </Text>
                <Text style={[styles.factValue, selectedPatient.allergy !== 'None listed' && styles.factDanger]}>
                  {selectedPatient.allergy}
                </Text>
              </View>
            </View>
            <View style={styles.aiBlock}>
              <Text style={styles.aiLabel}>Plain-language summary</Text>
              <Text style={styles.aiText}>{selectedPatient.summary}</Text>
            </View>
            <Disclaimer />
          </Card>

          <Card style={styles.panelSide}>
            <Text style={styles.panelEyebrow}>Department flow</Text>
            <Text style={styles.panelTitle}>Hospital work stays legible.</Text>
            <View style={styles.departmentList}>
              {hospitalDepartments.map((department) => {
                const isSelected = department.id === departmentId;
                return (
                  <Pressable
                    key={department.id}
                    accessibilityRole="button"
                    onPress={() => {
                      setDepartmentId(department.id);
                      setPatientId(null);
                    }}
                    style={[styles.departmentRow, isSelected && styles.departmentRowActive]}
                  >
                    <View style={[styles.departmentAccent, { backgroundColor: accentColor(department) }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.departmentName}>{department.name}</Text>
                      <Text style={styles.departmentStatus}>{department.status}</Text>
                    </View>
                    <Text style={styles.departmentCount}>{department.handoffs}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.queueHeader}>
              <Text style={styles.panelEyebrow}>Patient worklist</Text>
              <Text style={styles.queueSub}>{viewState.department.name}</Text>
            </View>
            <View style={styles.patientList}>
              {viewState.patients.map((patient) => {
                const isSelected = patient.id === selectedPatient.id;
                return (
                  <Pressable
                    key={patient.id}
                    accessibilityRole="button"
                    onPress={() => setPatientId(patient.id)}
                    style={[styles.patientListRow, isSelected && styles.patientListRowActive]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.patientListName}>{patient.name}</Text>
                      <Text style={styles.patientListMeta}>{patient.condition}</Text>
                    </View>
                    <StatusPill label={patient.consent} tone={consentTone(patient)} />
                  </Pressable>
                );
              })}
            </View>
          </Card>
        </View>

        <Card style={styles.timelineCard}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.panelEyebrow}>Consent-first database</Text>
              <Text style={styles.panelTitle}>From patient upload to hospital audit trail.</Text>
            </View>
          </View>
          <View style={styles.timeline}>
            {timeline.map((item, index) => (
              <View key={item} style={styles.timelineStep}>
                <Text style={styles.timelineNumber}>0{index + 1}</Text>
                <Text style={styles.timelineText}>{item}</Text>
              </View>
            ))}
          </View>
        </Card>
      </FadeIn>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: bloom.bg },
  content: { padding: bloom.space.xl, paddingBottom: 56 },
  page: { width: '100%', maxWidth: 1180, alignSelf: 'center' },
  nav: {
    paddingTop: Platform.OS === 'web' ? 18 : 44,
    paddingBottom: bloom.space.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: bloom.space.lg,
    flexWrap: 'wrap',
  },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: bloom.space.md },
  brand: { color: bloom.primaryInk, ...bloom.text.h2 },
  navSub: { color: bloom.muted, ...bloom.text.small, marginTop: 2 },
  navActions: { flexDirection: 'row', gap: bloom.space.sm, flexWrap: 'wrap' },
  navGhost: {
    minHeight: 44,
    borderRadius: bloom.radii.md,
    borderWidth: 1,
    borderColor: bloom.mint,
    paddingHorizontal: bloom.space.lg,
    justifyContent: 'center',
  },
  navGhostText: { color: bloom.primaryInk, ...bloom.text.small, fontWeight: '900' },
  navCta: {
    minHeight: 44,
    borderRadius: bloom.radii.md,
    backgroundColor: bloom.surface,
    borderWidth: 1,
    borderColor: bloom.mint,
    paddingHorizontal: bloom.space.lg,
    justifyContent: 'center',
    ...bloom.elevation.sm,
  },
  navCtaText: { color: bloom.primaryInk, ...bloom.text.small, fontWeight: '900' },
  hero: {
    minHeight: 520,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 40,
    flexWrap: 'wrap',
  },
  heroCompact: { minHeight: 0, padding: bloom.space.xl, gap: bloom.space.xl },
  heroCopy: { flex: 1, minWidth: 310 },
  heroTitle: { color: '#ffffff', fontSize: 44, lineHeight: 50, fontWeight: '900', letterSpacing: 0, marginTop: bloom.space.lg },
  heroBody: { color: '#e4fff5', fontSize: 18, lineHeight: 30, marginTop: bloom.space.xl, fontWeight: '700' },
  commandCard: { flex: 0.9, minWidth: 320, padding: bloom.space.xl, gap: bloom.space.lg, ...bloom.elevation.lg },
  commandLabel: { color: bloom.primaryInk, ...bloom.text.eyebrow, textTransform: 'uppercase' },
  commandTitle: { color: bloom.ink, ...bloom.text.h1 },
  metricGrid: { gap: bloom.space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: bloom.space.lg, marginTop: bloom.space.xl },
  panelLarge: { flex: 1.4, minWidth: 330, padding: bloom.space.xl },
  panelSide: { flex: 0.8, minWidth: 300, padding: bloom.space.xl },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: bloom.space.md, flexWrap: 'wrap', marginBottom: bloom.space.lg },
  panelEyebrow: { color: bloom.primaryInk, ...bloom.text.eyebrow, textTransform: 'uppercase', marginBottom: bloom.space.sm },
  panelTitle: { color: bloom.ink, ...bloom.text.h1 },
  patientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: bloom.space.md,
    flexWrap: 'wrap',
    paddingVertical: bloom.space.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: bloom.hair,
  },
  patientIdentity: { flex: 1, minWidth: 230 },
  patientName: { color: bloom.ink, ...bloom.text.h2 },
  patientMeta: { color: bloom.muted, ...bloom.text.small, marginTop: bloom.space.xs },
  factRow: { flexDirection: 'row', flexWrap: 'wrap', gap: bloom.space.md, marginTop: bloom.space.lg },
  factBox: {
    flex: 1,
    minWidth: 180,
    borderRadius: bloom.radii.md,
    backgroundColor: bloom.mintSoft,
    borderWidth: 1,
    borderColor: bloom.mint,
    padding: bloom.space.lg,
  },
  factBoxDanger: { backgroundColor: bloom.dangerSoft, borderColor: bloom.danger, borderWidth: 2 },
  factLabel: { color: bloom.primaryInk, ...bloom.text.eyebrow, textTransform: 'uppercase', marginBottom: bloom.space.sm },
  factValue: { color: bloom.ink, ...bloom.text.title },
  factDanger: { color: bloom.danger },
  aiBlock: {
    marginTop: bloom.space.lg,
    marginBottom: bloom.space.lg,
    borderRadius: bloom.radii.md,
    borderWidth: 1,
    borderColor: bloom.goldLine,
    backgroundColor: bloom.goldSoft,
    padding: bloom.space.lg,
  },
  aiLabel: { color: bloom.gold, ...bloom.text.eyebrow, textTransform: 'uppercase', marginBottom: bloom.space.sm },
  aiText: { color: bloom.ink, ...bloom.text.body, fontWeight: '700' },
  departmentList: { gap: bloom.space.md, marginTop: bloom.space.md },
  departmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: bloom.space.md,
    borderRadius: bloom.radii.md,
    borderWidth: 1,
    borderColor: bloom.hair,
    backgroundColor: bloom.surface2,
    padding: bloom.space.lg,
    minHeight: 72,
  },
  departmentRowActive: {
    borderColor: bloom.primary,
    backgroundColor: bloom.mintSoft,
    ...bloom.elevation.sm,
  },
  departmentAccent: { width: 5, height: 42, borderRadius: 3 },
  departmentName: { color: bloom.ink, ...bloom.text.title },
  departmentStatus: { color: bloom.muted, ...bloom.text.small, marginTop: 2 },
  departmentCount: { color: bloom.primaryInk, fontSize: 26, lineHeight: 30, fontWeight: '900', letterSpacing: 0 },
  queueHeader: { marginTop: bloom.space.xl, marginBottom: bloom.space.sm },
  queueSub: { color: bloom.muted, ...bloom.text.small, fontWeight: '800' },
  patientList: { gap: bloom.space.sm },
  patientListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: bloom.space.md,
    minHeight: 68,
    borderRadius: bloom.radii.md,
    borderWidth: 1,
    borderColor: bloom.hair,
    backgroundColor: bloom.surface,
    padding: bloom.space.md,
  },
  patientListRowActive: { borderColor: bloom.primary, backgroundColor: bloom.mintSoft },
  patientListName: { color: bloom.ink, ...bloom.text.title },
  patientListMeta: { color: bloom.muted, ...bloom.text.small, marginTop: 2 },
  timelineCard: { padding: bloom.space.xl, marginTop: bloom.space.lg, marginBottom: bloom.space.xl },
  timeline: { flexDirection: 'row', flexWrap: 'wrap', gap: bloom.space.md },
  timelineStep: {
    flex: 1,
    minWidth: 190,
    borderRadius: bloom.radii.md,
    backgroundColor: bloom.surface2,
    borderWidth: 1,
    borderColor: bloom.hair,
    padding: bloom.space.lg,
  },
  timelineNumber: { color: bloom.primaryInk, ...bloom.text.eyebrow, marginBottom: bloom.space.sm },
  timelineText: { color: bloom.ink, ...bloom.text.title },
});
