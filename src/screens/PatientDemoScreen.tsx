import React from 'react';
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
  ExplainedBadge,
  FactPill,
  FadeIn,
  GradientPanel,
  MetricTile,
  StatusPill,
} from '../components/Bloom';
import { formatDateLabel, formatDob } from '../lib/clinicRecord';
import type { ClinicReport } from '../types/clinic';
import { getPatientDemoState, patientDemoProof, patientShareSteps } from './patientDemoData';

function go(path: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.href = path;
  }
}

function ReportPreview({ report }: { report: ClinicReport }) {
  return (
    <Card style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.reportType}>{report.fileType}</Text>
          <Text style={styles.reportTitle}>{report.title}</Text>
          <Text style={styles.reportDate}>{formatDateLabel(report.recordedAt)}</Text>
        </View>
        {report.aiSummary ? <ExplainedBadge /> : null}
      </View>
      {report.aiSummary ? <Text style={styles.reportSummary}>{report.aiSummary}</Text> : null}
      {report.doctorQuestions.length > 0 ? (
        <View style={styles.questionBox}>
          <Text style={styles.questionTitle}>Questions ready for doctor</Text>
          {report.doctorQuestions.map((question) => (
            <Text key={question} style={styles.questionText}>
              - {question}
            </Text>
          ))}
        </View>
      ) : null}
      <Disclaimer />
    </Card>
  );
}

export default function PatientDemoScreen() {
  const { width } = useWindowDimensions();
  const compact = width < 820;
  const demo = getPatientDemoState();
  const allergyFact = demo.facts.find((fact) => fact.type === 'allergy');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <FadeIn style={styles.page}>
        <View style={styles.nav}>
          <View style={styles.brandLockup}>
            <BloomMark />
            <View>
              <Text style={styles.brand}>Bloom OS</Text>
              <Text style={styles.navSub}>Patient app demo</Text>
            </View>
          </View>
          <View style={styles.navActions}>
            <Pressable accessibilityRole="button" onPress={() => go('/')} style={styles.navGhost}>
              <Text style={styles.navGhostText}>Vision</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => go('/clinic?token=demo')} style={styles.navGhost}>
              <Text style={styles.navGhostText}>Clinic view</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => go('/investor')} style={styles.navCta}>
              <Text style={styles.navCtaText}>Investor proof</Text>
            </Pressable>
          </View>
        </View>

        <GradientPanel style={[styles.hero, compact && styles.heroCompact]}>
          <View style={styles.heroCopy}>
            <StatusPill label="B2C wedge" tone="dark" />
            <Text style={styles.heroTitle}>A personal health OS that feels ready before the visit.</Text>
            <Text style={styles.heroBody}>
              Bloom turns one patient-owned record into a calm timeline, a readable summary,
              allergy-aware context, and a doctor handoff the patient controls.
            </Text>
            <View style={styles.heroActions}>
              <Pressable accessibilityRole="button" onPress={() => go('/clinic?token=demo')} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Open doctor handoff</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => go('/hospital')} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>See hospital OS</Text>
              </Pressable>
            </View>
          </View>

          <Card style={styles.identityCard}>
            <Text style={styles.identityLabel}>Demo patient</Text>
            <Text style={styles.identityName}>{demo.patient.fullName}</Text>
            <Text style={styles.identityMeta}>
              DOB {formatDob(demo.patient.dob)} - Blood type {demo.patient.bloodType}
            </Text>
            <View style={styles.readerPanel}>
              <View style={styles.readerTopline}>
                <Text style={styles.readerFile}>{patientDemoProof.reportFileName}</Text>
                <Text style={styles.readerPercent}>100%</Text>
              </View>
              <View style={styles.readerBar}>
                <View style={styles.readerFill} />
              </View>
              <View style={styles.readerBottom}>
                <Text style={styles.readerStatus}>{patientDemoProof.readStatus}</Text>
                <Text style={styles.readerSafety}>✦ {patientDemoProof.safetyLine}</Text>
              </View>
            </View>
            <View style={styles.metricGrid}>
              <MetricTile label="Records" value={demo.counts.reports} caption={`${demo.counts.explainedReports} explained`} />
              <MetricTile label="Facts" value={demo.counts.facts} caption="condition, med, allergy" tone="gold" />
              <MetricTile label="Alerts" value={demo.counts.allergies} caption="allergy first" tone="danger" />
            </View>
          </Card>
        </GradientPanel>

        <View style={styles.grid}>
          <GradientPanel style={styles.summaryPanel}>
            <View style={styles.summaryHeader}>
              <View>
                <Text style={styles.summaryEyebrow}>At a glance</Text>
                <Text style={styles.summaryTitle}>Plain-language record memory.</Text>
              </View>
              <Text style={styles.summaryDate}>Updated {formatDateLabel(demo.summaryUpdatedAt)}</Text>
            </View>
            <Text style={styles.summaryText}>{demo.summary}</Text>
            <Disclaimer />
          </GradientPanel>

          <Card style={styles.sharePanel}>
            <Text style={styles.panelEyebrow}>Share flow</Text>
            <Text style={styles.panelTitle}>The patient stays in control.</Text>
            <View style={styles.flowList}>
              {patientShareSteps.map((item, index) => (
                <View key={item} style={styles.flowStep}>
                  <Text style={styles.flowNumber}>0{index + 1}</Text>
                  <Text style={styles.flowText}>{item}</Text>
                </View>
              ))}
            </View>
          </Card>
        </View>

        <Card style={styles.factsPanel}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.panelEyebrow}>Health facts</Text>
              <Text style={styles.panelTitle}>Small, structured context doctors can scan.</Text>
            </View>
            {allergyFact ? <StatusPill label={`Allergy: ${allergyFact.label}`} tone="danger" /> : null}
          </View>
          <View style={styles.factGrid}>
            {demo.facts.map((fact) => (
              <FactPill key={`${fact.type}-${fact.label}`} fact={fact} />
            ))}
          </View>
        </Card>

        <View style={styles.timelineHeader}>
          <Text style={styles.panelEyebrow}>Care timeline</Text>
          <Text style={styles.timelineTitle}>Explained records become reusable handoff context.</Text>
        </View>
        {demo.reports.map((report) => (
          <ReportPreview key={`${report.title}-${report.signedUrl}`} report={report} />
        ))}
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
    minHeight: 540,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 40,
    flexWrap: 'wrap',
  },
  heroCompact: { minHeight: 0, padding: bloom.space.xl, gap: bloom.space.xl },
  heroCopy: { flex: 1.1, minWidth: 310 },
  heroTitle: { color: '#ffffff', fontSize: 44, lineHeight: 50, fontWeight: '900', letterSpacing: 0, marginTop: bloom.space.lg },
  heroBody: { color: '#e4fff5', fontSize: 18, lineHeight: 30, fontWeight: '700', marginTop: bloom.space.xl },
  heroActions: { flexDirection: 'row', gap: bloom.space.md, flexWrap: 'wrap', marginTop: bloom.space.xxl },
  primaryButton: {
    minHeight: 54,
    backgroundColor: '#ffffff',
    borderRadius: bloom.radii.md,
    paddingHorizontal: bloom.space.xl,
    justifyContent: 'center',
  },
  primaryButtonText: { color: bloom.primaryInk, ...bloom.text.title },
  secondaryButton: {
    minHeight: 54,
    borderRadius: bloom.radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: bloom.space.xl,
    justifyContent: 'center',
  },
  secondaryButtonText: { color: '#ffffff', ...bloom.text.title },
  identityCard: { flex: 0.9, minWidth: 320, padding: bloom.space.xl, gap: bloom.space.lg, ...bloom.elevation.lg },
  identityLabel: { color: bloom.primaryInk, ...bloom.text.eyebrow, textTransform: 'uppercase' },
  identityName: { color: bloom.ink, ...bloom.text.display },
  identityMeta: { color: bloom.muted, ...bloom.text.small, fontWeight: '800' },
  readerPanel: {
    backgroundColor: bloom.surface2,
    borderRadius: bloom.radii.md,
    borderWidth: 1,
    borderColor: bloom.hair,
    padding: bloom.space.lg,
  },
  readerTopline: { flexDirection: 'row', justifyContent: 'space-between', gap: bloom.space.md, marginBottom: bloom.space.sm },
  readerFile: { color: bloom.ink, ...bloom.text.small, fontWeight: '900' },
  readerPercent: { color: bloom.primaryInk, ...bloom.text.small, fontWeight: '900' },
  readerBar: {
    height: 10,
    borderRadius: bloom.radii.pill,
    backgroundColor: bloom.mintSoft,
    overflow: 'hidden',
    marginBottom: bloom.space.sm,
  },
  readerFill: { width: '100%', height: '100%', backgroundColor: bloom.primary },
  readerBottom: { flexDirection: 'row', justifyContent: 'space-between', gap: bloom.space.md, flexWrap: 'wrap' },
  readerStatus: { color: bloom.primaryInk, ...bloom.text.eyebrow, textTransform: 'uppercase' },
  readerSafety: { color: bloom.gold, ...bloom.text.eyebrow },
  metricGrid: { gap: bloom.space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: bloom.space.lg, marginTop: bloom.space.xl },
  summaryPanel: { flex: 1.4, minWidth: 330, padding: bloom.space.xl, gap: bloom.space.lg },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: bloom.space.lg, flexWrap: 'wrap' },
  summaryEyebrow: { color: bloom.mint, ...bloom.text.eyebrow, textTransform: 'uppercase', marginBottom: bloom.space.sm },
  summaryTitle: { color: '#ffffff', ...bloom.text.h1 },
  summaryDate: { color: '#d8f6eb', ...bloom.text.small, fontWeight: '900' },
  summaryText: { color: '#ffffff', ...bloom.text.body, fontWeight: '700' },
  sharePanel: { flex: 0.8, minWidth: 300, padding: bloom.space.xl },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: bloom.space.md, flexWrap: 'wrap', marginBottom: bloom.space.lg },
  panelEyebrow: { color: bloom.primaryInk, ...bloom.text.eyebrow, textTransform: 'uppercase', marginBottom: bloom.space.sm },
  panelTitle: { color: bloom.ink, ...bloom.text.h1 },
  flowList: { gap: bloom.space.sm, marginTop: bloom.space.lg },
  flowStep: {
    minHeight: 58,
    borderRadius: bloom.radii.md,
    borderWidth: 1,
    borderColor: bloom.hair,
    backgroundColor: bloom.surface2,
    padding: bloom.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: bloom.space.md,
  },
  flowNumber: { color: bloom.primaryInk, ...bloom.text.eyebrow },
  flowText: { color: bloom.ink, ...bloom.text.title, flex: 1 },
  factsPanel: { padding: bloom.space.xl, marginTop: bloom.space.lg },
  factGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: bloom.space.md },
  timelineHeader: { marginTop: bloom.space.xxl, marginBottom: bloom.space.lg, maxWidth: 820 },
  timelineTitle: { color: bloom.ink, ...bloom.text.display },
  reportCard: { padding: bloom.space.xl, marginBottom: bloom.space.lg },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: bloom.space.md },
  reportType: { color: bloom.primaryInk, ...bloom.text.eyebrow, textTransform: 'uppercase', marginBottom: bloom.space.sm },
  reportTitle: { color: bloom.ink, ...bloom.text.h1 },
  reportDate: { color: bloom.muted, ...bloom.text.small, marginTop: bloom.space.xs },
  reportSummary: { color: bloom.ink, ...bloom.text.body, fontWeight: '700', marginTop: bloom.space.lg },
  questionBox: {
    backgroundColor: bloom.surface2,
    borderRadius: bloom.radii.md,
    borderWidth: 1,
    borderColor: bloom.hair,
    padding: bloom.space.lg,
    marginTop: bloom.space.lg,
    marginBottom: bloom.space.lg,
  },
  questionTitle: { color: bloom.primaryInk, ...bloom.text.small, fontWeight: '900', marginBottom: bloom.space.sm },
  questionText: { color: bloom.ink, ...bloom.text.small, marginBottom: bloom.space.xs },
});
