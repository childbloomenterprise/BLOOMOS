import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { bloom } from '../../contract/tokens';
import { Card, Disclaimer, FactPill, TimelineItem, TrustBar } from '../components/Bloom';
import {
  formatDob,
  getClinicAtAGlance,
  getViewerHistoryLine,
  readClinicRecord,
  toClinicViewState,
} from '../lib/clinicRecord';
import type { ClinicFactType, ClinicViewState } from '../types/clinic';

const factLabels: Record<ClinicFactType, string> = {
  condition: 'Conditions',
  medication: 'Medications',
  allergy: 'Allergies',
};

export default function ClinicScreen({ token }: { token: string | null }) {
  const [state, setState] = useState<'loading' | ClinicViewState>('loading');
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;

    setState('loading');
    opacity.setValue(0);

    readClinicRecord(token).then((result) => {
      if (cancelled) return;
      setState(toClinicViewState(result));
      Animated.timing(opacity, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      cancelled = true;
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
          <Text style={styles.product}>Bloom OS Clinic View</Text>
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

        <Card style={styles.hero}>
          <View style={styles.patientBlock}>
            <Text style={styles.patientName}>{record.patient.fullName}</Text>
            <Text style={styles.patientMeta}>DOB {formatDob(record.patient.dob)}</Text>
          </View>
          <View style={styles.bloodBadge}>
            <Text style={styles.bloodLabel}>Blood type</Text>
            <Text style={styles.bloodValue}>{record.patient.bloodType}</Text>
          </View>
        </Card>

        <TrustBar
          sharedAt={record.sharedAt}
          expiresAt={record.expiresAt}
          viewedCount={record.viewedCount}
          viewerHistory={getViewerHistoryLine(record)}
        />

        <Card style={styles.glanceCard}>
          <View style={styles.glanceHeader}>
            <Text style={styles.sectionTitle}>At a glance</Text>
            <Text style={styles.glanceReport}>{atAGlance.latestReportTitle}</Text>
          </View>
          <Text style={styles.glanceSummary}>{atAGlance.latestReportSummary}</Text>
          <View style={styles.glanceStats}>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{atAGlance.conditionCount}</Text>
              <Text style={styles.statLabel}>conditions</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{atAGlance.medicationCount}</Text>
              <Text style={styles.statLabel}>medications</Text>
            </View>
            <View style={[styles.statPill, styles.statPillDanger]}>
              <Text style={[styles.statValue, styles.statDanger]}>{atAGlance.allergyCount}</Text>
              <Text style={[styles.statLabel, styles.statDanger]}>allergies</Text>
            </View>
          </View>
          {allergyFacts.length > 0 ? (
            <View style={styles.allergyAlert}>
              <Text style={styles.allergyAlertLabel}>Allergy alert</Text>
              <Text style={styles.allergyAlertText}>{atAGlance.allergySummary}</Text>
            </View>
          ) : null}
          <Disclaimer />
        </Card>

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: bloom.bg },
  content: { padding: 18, paddingBottom: 44 },
  page: {
    width: '100%',
    maxWidth: 1060,
    alignSelf: 'center',
    gap: bloom.gap,
  },
  topline: {
    paddingTop: Platform.OS === 'web' ? 18 : 38,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  toplineRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    flexWrap: 'wrap',
  },
  product: { color: bloom.primaryInk, fontSize: 15, fontWeight: '900' },
  secure: { color: bloom.muted, fontSize: 14, fontWeight: '700' },
  printButton: {
    minHeight: 44,
    backgroundColor: bloom.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    justifyContent: 'center',
  },
  printButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  hero: {
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 18,
    flexWrap: 'wrap',
  },
  patientBlock: { flex: 1, minWidth: 260 },
  patientName: { color: bloom.ink, fontSize: 34, fontWeight: '900', lineHeight: 40 },
  patientMeta: { color: bloom.muted, fontSize: 17, marginTop: 8, fontWeight: '600' },
  bloodBadge: {
    backgroundColor: bloom.accent,
    borderRadius: bloom.radius,
    paddingHorizontal: 18,
    paddingVertical: 14,
    minWidth: 132,
  },
  bloodLabel: { color: bloom.primaryInk, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  bloodValue: { color: bloom.primaryInk, fontSize: 28, fontWeight: '900', marginTop: 4 },
  grid: { flexDirection: 'row', gap: bloom.gap, flexWrap: 'wrap' },
  glanceCard: {
    padding: 18,
    gap: 14,
  },
  glanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
    flexWrap: 'wrap',
  },
  glanceReport: { color: bloom.primaryInk, fontSize: 14, fontWeight: '900' },
  glanceSummary: { color: bloom.ink, fontSize: 17, lineHeight: 27, fontWeight: '500' },
  glanceStats: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  statPill: {
    backgroundColor: '#F0F7F4',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D6E8E0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 128,
  },
  statPillDanger: { backgroundColor: '#FFF0EE', borderColor: bloom.danger, borderWidth: 2 },
  statValue: { color: bloom.primaryInk, fontSize: 23, fontWeight: '900' },
  statLabel: { color: bloom.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  statDanger: { color: bloom.danger },
  allergyAlert: {
    backgroundColor: '#FFF0EE',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: bloom.danger,
    padding: 14,
  },
  allergyAlertLabel: {
    color: bloom.danger,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  allergyAlertText: { color: '#7A1E15', fontSize: 18, fontWeight: '900', lineHeight: 24 },
  factGroup: { flex: 1, minWidth: 280, padding: 18 },
  sectionHeader: { marginTop: 4 },
  sectionTitle: { color: bloom.ink, fontSize: 19, fontWeight: '900', marginBottom: 12 },
  dangerTitle: { color: bloom.danger },
  factList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  unavailableWrap: {
    flex: 1,
    backgroundColor: bloom.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 22,
  },
  unavailable: { width: '100%', maxWidth: 520, gap: 14 },
  unavailableTitle: { color: bloom.ink, fontSize: 28, fontWeight: '900', textAlign: 'center' },
  unavailableMessage: { color: bloom.muted, fontSize: 17, lineHeight: 25, textAlign: 'center' },
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
  loadingText: { color: bloom.muted, fontSize: 15, fontWeight: '700', marginTop: 12 },
  skeletonPage: { width: '100%', maxWidth: 1060, alignSelf: 'center', padding: 18, paddingTop: 78, gap: 16 },
  skeleton: { backgroundColor: '#E8F2EE', borderRadius: bloom.radius },
  skeletonHero: { height: 150 },
  skeletonBar: { height: 54 },
  skeletonGrid: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  skeletonCard: { flex: 1, minWidth: 260, height: 156 },
  skeletonTimeline: { height: 260 },
});
