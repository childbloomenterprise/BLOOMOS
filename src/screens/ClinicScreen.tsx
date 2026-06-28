import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AccessibilityInfo,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import clinicFixture from '../../contract/clinic-record.fixture.json';
import { bloom } from '../../contract/tokens';
import { BloomMark, Card, Disclaimer, FactPill, GradientPanel, MetricTile, StatusPill, TimelineItem, TrustBar } from '../components/Bloom';
import {
  formatDob,
  getClinicAtAGlance,
  getViewerHistoryLine,
  readClinicRecord,
  toClinicViewState,
} from '../lib/clinicRecord';
import type { ClinicError, ClinicFactType, ClinicRecord, ClinicRecordResult, ClinicViewState } from '../types/clinic';

const factLabels: Record<ClinicFactType, string> = {
  condition: 'Conditions',
  medication: 'Medications',
  allergy: 'Allergies',
};

// Dev shortcuts for exercising each UI state without a live share: the literal
// tokens below render that error, and 'pending' renders the waiting state. ANY
// OTHER (real) token goes to the LIVE clinic-record function — that is what drives
// the real scan -> owner approves -> record handshake. For fully offline UI work
// against the static fixture, set EXPO_PUBLIC_USE_FIXTURES=1 (readClinicRecord
// honours it).
const demoStateTokens: ClinicError[] = ['invalid', 'expired', 'revoked', 'rate_limited', 'denied'];

async function readClinicForToken(token: string | null): Promise<ClinicRecordResult> {
  const normalizedToken = token?.trim() ?? '';

  if (!normalizedToken) {
    return { error: 'invalid' };
  }

  if ((demoStateTokens as string[]).includes(normalizedToken)) {
    return { error: normalizedToken as ClinicError };
  }

  if (normalizedToken === 'pending') {
    return { status: 'pending' };
  }

  if (normalizedToken === 'demo') {
    return clinicFixture as ClinicRecord;
  }

  return readClinicRecord(token);
}

// How often the doctor's device re-checks while waiting for the owner to approve,
// and how long it keeps trying before telling them to ask the patient to retry.
const POLL_MS = 2500;
const MAX_WAIT_MS = 5 * 60 * 1000;

export default function ClinicScreen({ token }: { token: string | null }) {
  const [state, setState] = useState<'loading' | ClinicViewState>('loading');
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let fadedIn = false;
    const startedAt = Date.now();

    setState('loading');
    opacity.setValue(0);

    const fadeInOnce = () => {
      if (fadedIn) return;
      fadedIn = true;
      AccessibilityInfo.isReduceMotionEnabled().then((reducedMotion) => {
        if (cancelled) return;
        if (reducedMotion) {
          opacity.setValue(1);
          return;
        }
        Animated.timing(opacity, { toValue: 1, duration: 240, useNativeDriver: true }).start();
      });
    };

    // Poll the consent gate: 'pending' means the owner hasn't accepted yet, so we
    // re-check until it flips to a record or a terminal error (or we give up).
    const poll = async () => {
      const result = await readClinicForToken(token);
      if (cancelled) return;

      const view = toClinicViewState(result);
      setState(view);
      fadeInOnce();

      if (view.kind === 'pending' && Date.now() - startedAt < MAX_WAIT_MS) {
        timer = setTimeout(poll, POLL_MS);
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [token, opacity]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    if (document.getElementById('bloom-clinic-print-style')) return;

    const style = document.createElement('style');
    style.id = 'bloom-clinic-print-style';
    style.textContent = `
      @media print {
        @page { margin: 18mm; }
        body { background: #fff !important; }
        [data-print-hidden="true"] { display: none !important; }
        [data-print-root="true"] { box-shadow: none !important; }
        a, div, span, p { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  if (state === 'loading') {
    return <ClinicSkeleton />;
  }

  if (state.kind === 'pending') {
    return <ClinicWaiting opacity={opacity} />;
  }

  if (state.kind === 'unavailable') {
    return (
      <View style={styles.unavailableWrap}>
        <Animated.View style={[styles.unavailable, { opacity }]}>
          <Text style={styles.unavailableTitle}>{state.title}</Text>
          <Text style={styles.unavailableMessage}>{state.message}</Text>
          <Disclaimer />
        </Animated.View>
      </View>
    );
  }

  const { record } = state;
  const atAGlance = getClinicAtAGlance(record);
  const allergyFacts = record.facts.filter((fact) => fact.type === 'allergy');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Animated.View style={[styles.page, { opacity }]} {...({ dataSet: { printRoot: 'true' } } as any)}>
        <View style={styles.topline}>
          <View style={styles.productLockup}>
            <BloomMark size={32} />
            <Text style={styles.product}>Bloom OS Clinic View</Text>
          </View>
          <View style={styles.toplineRight}>
            <Text style={styles.secure}>Read-only shared record</Text>
            {Platform.OS === 'web' ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => window.print()}
                style={styles.printButton}
                {...({ dataSet: { printHidden: 'true' } } as any)}
              >
                <Text style={styles.printButtonText}>Print / Save as PDF</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <GradientPanel style={styles.hero}>
          <View style={styles.patientBlock}>
            <StatusPill label="Read-only handoff" tone="dark" />
            <Text style={styles.patientName}>{record.patient.fullName}</Text>
            <Text style={styles.patientMeta}>DOB {formatDob(record.patient.dob)}</Text>
          </View>
          <View style={styles.bloodBadge}>
            <Text style={styles.bloodLabel}>Blood type</Text>
            <Text style={styles.bloodValue}>{record.patient.bloodType}</Text>
          </View>
        </GradientPanel>

        <TrustBar
          sharedAt={record.sharedAt}
          expiresAt={record.expiresAt}
          viewedCount={record.viewedCount}
          viewerHistory={getViewerHistoryLine(record)}
        />

        <GradientPanel style={styles.glanceCard}>
          <View style={styles.glanceHeader}>
            <View>
              <Text style={styles.glanceEyebrow}>Clinical summary</Text>
              <Text style={styles.glanceTitle}>At a glance</Text>
            </View>
            <Text style={styles.glanceReport}>{atAGlance.latestReportTitle}</Text>
          </View>
          <Text style={styles.glanceSummary}>{atAGlance.latestReportSummary}</Text>
          <View style={styles.glanceStats}>
            <MetricTile label="Conditions" value={atAGlance.conditionCount} caption="patient-stated" tone="dark" />
            <MetricTile label="Medications" value={atAGlance.medicationCount} caption="active context" tone="dark" />
            <MetricTile label="Allergies" value={atAGlance.allergyCount} caption="verify first" tone="danger" />
          </View>
          {allergyFacts.length > 0 ? (
            <View style={styles.allergyAlert}>
              <Text style={styles.allergyAlertLabel}>Allergy alert</Text>
              <Text style={styles.allergyAlertText}>{atAGlance.allergySummary}</Text>
            </View>
          ) : null}
          <Disclaimer />
        </GradientPanel>

        <View style={styles.grid}>
          {(['condition', 'medication', 'allergy'] as ClinicFactType[]).map((type) => {
            const facts = record.facts.filter((fact) => fact.type === type);
            return (
              <Card key={type} style={styles.factGroup}>
                <Text style={[styles.sectionTitle, type === 'allergy' && styles.dangerTitle]}>
                  {factLabels[type]}
                </Text>
                <View style={styles.factList}>
                  {facts.map((fact) => (
                    <FactPill key={`${fact.type}-${fact.label}`} fact={fact} />
                  ))}
                </View>
              </Card>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Reports timeline</Text>
        </View>

        {record.reports.map((report, index) => (
          <TimelineItem
            key={`${report.title}-${report.signedUrl}`}
            report={report}
            isLast={index === record.reports.length - 1}
          />
        ))}

        <Disclaimer />
      </Animated.View>
    </ScrollView>
  );
}

function ClinicSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="large" color={bloom.primary} />
        <Text style={styles.loadingText}>Opening secure clinic view...</Text>
      </View>
      <View style={styles.skeletonPage}>
        <View style={[styles.skeleton, styles.skeletonHero]} />
        <View style={[styles.skeleton, styles.skeletonBar]} />
        <View style={styles.skeletonGrid}>
          <View style={[styles.skeleton, styles.skeletonCard]} />
          <View style={[styles.skeleton, styles.skeletonCard]} />
          <View style={[styles.skeleton, styles.skeletonCard]} />
        </View>
        <View style={[styles.skeleton, styles.skeletonTimeline]} />
      </View>
    </View>
  );
}

// Shown on the doctor's device while the consent gate is still closed. The poll in
// ClinicScreen swaps this for the record the moment the owner accepts.
function ClinicWaiting({ opacity }: { opacity: Animated.Value }) {
  return (
    <View style={styles.unavailableWrap}>
      <Animated.View style={[styles.waiting, { opacity }]}>
        <ActivityIndicator size="large" color={bloom.primary} />
        <Text style={styles.waitingTitle}>Waiting for the patient to approve</Text>
        <Text style={styles.waitingMessage}>
          Your request reached the patient. The moment they tap Accept on their device, their
          read-only record opens here automatically.
        </Text>
        <Disclaimer />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: bloom.bg },
  content: { padding: bloom.space.xl, paddingBottom: 44 },
  page: {
    width: '100%',
    maxWidth: 1060,
    alignSelf: 'center',
    gap: bloom.space.lg,
  },
  topline: {
    paddingTop: Platform.OS === 'web' ? 18 : 38,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: bloom.space.md,
    flexWrap: 'wrap',
  },
  productLockup: { flexDirection: 'row', alignItems: 'center', gap: bloom.space.md },
  toplineRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: bloom.space.sm,
    flexWrap: 'wrap',
  },
  product: { color: bloom.primaryInk, ...bloom.text.title },
  secure: { color: bloom.muted, ...bloom.text.small, fontWeight: '800' },
  printButton: {
    minHeight: 44,
    backgroundColor: bloom.primary,
    borderRadius: bloom.radii.md,
    paddingHorizontal: bloom.space.lg,
    paddingVertical: bloom.space.md,
    justifyContent: 'center',
    ...bloom.elevation.sm,
  },
  printButtonText: { color: '#ffffff', ...bloom.text.small, fontWeight: '900' },
  hero: {
    padding: bloom.space.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: bloom.space.lg,
    flexWrap: 'wrap',
  },
  patientBlock: { flex: 1, minWidth: 260 },
  patientName: { color: '#ffffff', ...bloom.text.display, marginTop: bloom.space.lg },
  patientMeta: { color: '#d8f6eb', ...bloom.text.body, marginTop: bloom.space.sm, fontWeight: '700' },
  bloodBadge: {
    backgroundColor: bloom.mint,
    borderRadius: bloom.radii.card,
    paddingHorizontal: bloom.space.xl,
    paddingVertical: bloom.space.lg,
    minWidth: 132,
  },
  bloodLabel: { color: bloom.primaryInk, ...bloom.text.eyebrow, textTransform: 'uppercase' },
  bloodValue: { color: bloom.primaryInk, fontSize: 28, lineHeight: 32, fontWeight: '900', letterSpacing: 0, marginTop: bloom.space.xs },
  grid: { flexDirection: 'row', gap: bloom.space.lg, flexWrap: 'wrap' },
  glanceCard: {
    padding: bloom.space.xl,
    gap: bloom.space.lg,
  },
  glanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: bloom.space.lg,
    flexWrap: 'wrap',
  },
  glanceEyebrow: { color: bloom.mint, ...bloom.text.eyebrow, textTransform: 'uppercase', marginBottom: bloom.space.xs },
  glanceTitle: { color: '#ffffff', ...bloom.text.h1 },
  glanceReport: { color: '#d8f6eb', ...bloom.text.small, fontWeight: '900' },
  glanceSummary: { color: '#ffffff', ...bloom.text.body, fontWeight: '700' },
  glanceStats: { flexDirection: 'row', gap: bloom.space.sm, flexWrap: 'wrap' },
  statPill: {
    backgroundColor: bloom.mintSoft,
    borderRadius: bloom.radii.md,
    borderWidth: 1,
    borderColor: bloom.mint,
    paddingHorizontal: bloom.space.lg,
    paddingVertical: bloom.space.md,
    minWidth: 128,
  },
  statPillDanger: { backgroundColor: bloom.dangerSoft, borderColor: bloom.danger, borderWidth: 2 },
  statValue: { color: bloom.primaryInk, fontSize: 23, lineHeight: 27, fontWeight: '900', letterSpacing: 0 },
  statLabel: { color: bloom.muted, ...bloom.text.eyebrow, textTransform: 'uppercase' },
  statDanger: { color: bloom.danger },
  allergyAlert: {
    backgroundColor: bloom.dangerSoft,
    borderRadius: bloom.radii.md,
    borderWidth: 2,
    borderColor: bloom.danger,
    padding: bloom.space.lg,
  },
  allergyAlertLabel: {
    color: bloom.danger,
    ...bloom.text.eyebrow,
    textTransform: 'uppercase',
    marginBottom: bloom.space.xs,
  },
  allergyAlertText: { color: '#7a1e15', ...bloom.text.h2 },
  factGroup: { flex: 1, minWidth: 280, padding: bloom.space.xl },
  sectionHeader: { marginTop: bloom.space.xs },
  sectionTitle: { color: bloom.ink, ...bloom.text.h2, marginBottom: bloom.space.md },
  dangerTitle: { color: bloom.danger },
  factList: { flexDirection: 'row', flexWrap: 'wrap', gap: bloom.space.sm },
  unavailableWrap: {
    flex: 1,
    backgroundColor: bloom.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: bloom.space.xl,
  },
  unavailable: { width: '100%', maxWidth: 520, gap: bloom.space.lg },
  unavailableTitle: { color: bloom.ink, ...bloom.text.h1, textAlign: 'center' },
  unavailableMessage: { color: bloom.muted, ...bloom.text.body, textAlign: 'center' },
  waiting: { width: '100%', maxWidth: 520, gap: bloom.space.lg, alignItems: 'center' },
  waitingTitle: { color: bloom.ink, ...bloom.text.h1, textAlign: 'center' },
  waitingMessage: { color: bloom.muted, ...bloom.text.body, textAlign: 'center' },
  loadingCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  loadingText: { color: bloom.muted, ...bloom.text.small, fontWeight: '700', marginTop: bloom.space.md },
  skeletonPage: { width: '100%', maxWidth: 1060, alignSelf: 'center', padding: bloom.space.xl, paddingTop: 78, gap: bloom.space.lg },
  skeleton: { backgroundColor: '#e8f2ee', borderRadius: bloom.radii.card },
  skeletonHero: { height: 150 },
  skeletonBar: { height: 54 },
  skeletonGrid: { flexDirection: 'row', gap: bloom.space.lg, flexWrap: 'wrap' },
  skeletonCard: { flex: 1, minWidth: 260, height: 156 },
  skeletonTimeline: { height: 260 },
});
