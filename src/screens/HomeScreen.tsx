import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import patientSummaryFixture from '../../contract/patient-summary.fixture.json';
import { bloom } from '../../contract/tokens';
import {
  Card,
  Disclaimer,
  ExplainedBadge,
  FactPill,
  FadeIn,
  GradientPanel,
  MetricTile,
  SkeletonBlock,
  StatusPill,
  ToastBanner,
} from '../components/Bloom';
import { useAuth } from '../context/AuthContext';
import { listFacts } from '../lib/facts';
import { getPatientSummary, type PatientSummary } from '../lib/summary';
import { supabase } from '../lib/supabase';
import type { HealthFact } from '../types/facts';
import type { HealthRecord } from '../types/health';

interface Props {
  onAddRecord: () => void;
  onViewRecord: (id: string) => void;
  onOpenFacts: () => void;
  onOpenShare: () => void;
  onOpenSettings: () => void;
  toast?: string | null;
  onToastDone?: () => void;
}

type TimelineEntry =
  | { kind: 'record'; id: string; createdAt: string; record: HealthRecord }
  | { kind: 'fact'; id: string; createdAt: string; fact: HealthFact };

function fileLabel(type: string) {
  if (type === 'image') return 'Image';
  if (type === 'pdf') return 'PDF';
  return 'Doc';
}

function accentColor(type: string) {
  if (type === 'image') return '#2f80ed';
  if (type === 'pdf') return bloom.danger;
  return bloom.muted;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function RecordCard({ record, onPress }: { record: HealthRecord; onPress: () => void }) {
  const explained = record.ai_status === 'done' && !!record.ai_summary;

  return (
    <Pressable accessibilityRole="button" style={styles.card} onPress={onPress}>
      <View style={[styles.cardAccent, { backgroundColor: accentColor(record.file_type) }]} />
      <View style={styles.cardBody}>
        <View style={styles.fileBadge}>
          <Text style={styles.fileBadgeText}>{fileLabel(record.file_type)}</Text>
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {record.title}
          </Text>
          <Text style={styles.cardDate}>{formatDate(record.recorded_at ?? record.created_at)}</Text>
          {explained ? (
            <>
              <ExplainedBadge />
              <Text style={styles.cardSnippet} numberOfLines={2}>
                {record.ai_summary}
              </Text>
            </>
          ) : null}
        </View>
        <Text style={styles.chevron}>{'>'}</Text>
      </View>
    </Pressable>
  );
}

function FactTimelineCard({ fact }: { fact: HealthFact }) {
  return (
    <Card style={styles.factTimelineCard}>
      <View style={styles.factTimelineHeader}>
        <Text style={[styles.factTimelineLabel, fact.type === 'allergy' && styles.factTimelineLabelDanger]}>
          {fact.type === 'allergy' ? 'Allergy' : fact.type === 'medication' ? 'Medication' : 'Condition'}
        </Text>
        <Text style={styles.cardDate}>{formatDate(fact.created_at)}</Text>
      </View>
      <FactPill fact={{ type: fact.type, label: fact.label, detail: fact.detail }} />
    </Card>
  );
}

export default function HomeScreen({
  onAddRecord,
  onViewRecord,
  onOpenFacts,
  onOpenShare,
  onOpenSettings,
  toast,
  onToastDone,
}: Props) {
  const { session } = useAuth();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [facts, setFacts] = useState<HealthFact[]>([]);
  const [summary, setSummary] = useState<PatientSummary>({
    summary: patientSummaryFixture.summary,
    summaryUpdatedAt: patientSummaryFixture.summaryUpdatedAt,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timeline = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = [
      ...records.map((record) => ({
        kind: 'record' as const,
        id: `record-${record.id}`,
        createdAt: record.created_at,
        record,
      })),
      ...facts.map((fact) => ({
        kind: 'fact' as const,
        id: `fact-${fact.id}`,
        createdAt: fact.created_at,
        fact,
      })),
    ];

    return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [facts, records]);

  const careStats = useMemo(() => {
    const explained = records.filter((record) => record.ai_status === 'done' && !!record.ai_summary).length;
    const allergyCount = facts.filter((fact) => fact.type === 'allergy').length;

    return {
      explained,
      allergyCount,
      factCount: facts.length,
      recordCount: records.length,
    };
  }, [facts, records]);

  const fetchHomeData = useCallback(async () => {
    setError(null);

    try {
      const [{ data, error: recordsError }, nextFacts, nextSummary] = await Promise.all([
        supabase
          .from('health_records')
          .select('*')
          .eq('user_id', session!.user.id)
          .order('created_at', { ascending: false }),
        listFacts(),
        getPatientSummary(session!.user.id).catch(() => ({
          summary: patientSummaryFixture.summary,
          summaryUpdatedAt: patientSummaryFixture.summaryUpdatedAt,
        })),
      ]);

      if (recordsError) throw recordsError;

      setRecords((data ?? []) as HealthRecord[]);
      setFacts(nextFacts);
      setSummary({
        summary: nextSummary.summary ?? patientSummaryFixture.summary,
        summaryUpdatedAt: nextSummary.summaryUpdatedAt ?? patientSummaryFixture.summaryUpdatedAt,
      });
    } catch {
      setError('Could not load your timeline. Pull down to retry.');
    }
  }, [session]);

  useEffect(() => {
    fetchHomeData().finally(() => setLoading(false));
  }, [fetchHomeData]);

  useEffect(() => {
    if (!toast || !onToastDone) return;
    const id = setTimeout(onToastDone, 3200);
    return () => clearTimeout(id);
  }, [toast, onToastDone]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHomeData();
    setRefreshing(false);
  }, [fetchHomeData]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>Bloom OS</Text>
          <Text style={styles.subtitle}>Patient command center</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable accessibilityRole="button" onPress={onOpenFacts} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>My Health</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onOpenSettings} style={styles.headerBtnGhost}>
            <Text style={styles.headerBtnGhostText}>Settings</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => supabase.auth.signOut()} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <HomeSkeleton />
      ) : (
        <FlatList
          data={timeline}
          keyExtractor={(item) => item.id}
          contentContainerStyle={timeline.length === 0 ? styles.emptyContainer : styles.list}
          ListHeaderComponent={
            <>
              {toast ? <ToastBanner message={toast} /> : null}
              <FadeIn style={styles.homeLead}>
                <StatusPill label="Your health OS" />
                <Text style={styles.homeTitle}>Everything your doctor needs, organized before the visit.</Text>
                <Text style={styles.homeBody}>
                  Bloom keeps your reports, facts, allergies, and explanations in one quiet timeline
                  so the next handoff starts with context instead of chaos.
                </Text>
              </FadeIn>
              <FadeIn style={styles.metricRow}>
                <MetricTile
                  label="Records"
                  value={careStats.recordCount}
                  caption={`${careStats.explained} explained`}
                />
                <MetricTile
                  label="Facts"
                  value={careStats.factCount}
                  caption="conditions, meds, allergies"
                />
                <MetricTile
                  label="Alerts"
                  value={careStats.allergyCount}
                  caption="allergy flags"
                  tone={careStats.allergyCount > 0 ? 'danger' : 'mint'}
                />
              </FadeIn>
              <FadeIn>
                <GradientPanel style={styles.summaryCard}>
                  <View style={styles.summaryHeader}>
                    <Text style={styles.summaryEyebrow}>At a glance</Text>
                    <Text style={styles.summaryStamp}>
                      {summary.summaryUpdatedAt ? `Updated ${formatDate(summary.summaryUpdatedAt)}` : 'Ready when records arrive'}
                    </Text>
                  </View>
                  <Text style={styles.summaryText}>
                    {summary.summary ?? 'Add facts and explained records to generate a calm doctor handoff.'}
                  </Text>
                  <Disclaimer />
                </GradientPanel>
              </FadeIn>
              {timeline.length > 0 ? (
                <FadeIn>
                  <Pressable accessibilityRole="button" style={styles.shareCta} onPress={onOpenShare}>
                    <Text style={styles.shareCtaIcon}>Clinic</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shareCtaTitle}>Prepare doctor handoff</Text>
                      <Text style={styles.shareCtaSub}>QR link, expiry, revoke, and viewer history</Text>
                    </View>
                    <Text style={styles.shareCtaChevron}>{'>'}</Text>
                  </Pressable>
                </FadeIn>
              ) : null}
              {timeline.length > 0 ? (
                <View style={styles.timelineHeading}>
                  <Text style={styles.timelineTitle}>Care timeline</Text>
                  <Text style={styles.timelineSub}>Newest records and health facts first</Text>
                </View>
              ) : null}
            </>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={bloom.primary} />}
          ListEmptyComponent={
            <FadeIn style={styles.empty}>
              <Text style={styles.emptyTitle}>No health records yet</Text>
              <Text style={styles.emptyNote}>
                {error ??
                  'Start by adding one report, prescription, scan, or note. Bloom OS keeps it ready for you and readable for your doctor.'}
              </Text>
              <Pressable accessibilityRole="button" style={styles.emptyButton} onPress={onAddRecord}>
                <Text style={styles.emptyButtonText}>Add first record</Text>
              </Pressable>
            </FadeIn>
          }
          renderItem={({ item }) => (
            <FadeIn>
              {item.kind === 'record' ? (
                <RecordCard record={item.record} onPress={() => onViewRecord(item.record.id)} />
              ) : (
                <FactTimelineCard fact={item.fact} />
              )}
            </FadeIn>
          )}
        />
      )}

      <Pressable accessibilityRole="button" style={styles.fab} onPress={onAddRecord}>
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>
    </View>
  );
}

function HomeSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      <SkeletonBlock style={styles.skeletonShare} />
      <SkeletonBlock style={styles.skeletonCard} />
      <SkeletonBlock style={styles.skeletonCard} />
      <SkeletonBlock style={styles.skeletonCard} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: bloom.bg },
  header: {
    backgroundColor: bloom.surface,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: bloom.space.lg,
    paddingHorizontal: bloom.space.xl,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: bloom.space.lg,
    flexWrap: 'wrap',
    ...bloom.elevation.sm,
  },
  brand: { ...bloom.text.h1, color: bloom.primaryInk },
  subtitle: { ...bloom.text.small, color: bloom.muted, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: bloom.space.sm, flexWrap: 'wrap' },
  headerBtn: {
    backgroundColor: bloom.accent,
    borderRadius: bloom.radii.sm,
    paddingVertical: bloom.space.sm,
    paddingHorizontal: bloom.space.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  headerBtnText: { color: bloom.primaryInk, ...bloom.text.small, fontWeight: '900' },
  headerBtnGhost: {
    borderRadius: bloom.radii.sm,
    paddingVertical: bloom.space.sm,
    paddingHorizontal: bloom.space.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  headerBtnGhostText: { color: bloom.muted, ...bloom.text.small, fontWeight: '800' },
  logoutBtn: { paddingVertical: bloom.space.sm, paddingHorizontal: bloom.space.xs, minHeight: 44, justifyContent: 'center' },
  logoutText: { color: bloom.muted, ...bloom.text.small },
  list: { padding: bloom.space.lg, paddingBottom: 100 },
  homeLead: {
    backgroundColor: bloom.surface,
    borderRadius: bloom.radii.card,
    borderWidth: 1,
    borderColor: bloom.hair,
    padding: bloom.space.xl,
    marginBottom: bloom.space.lg,
    ...bloom.elevation.sm,
  },
  homeTitle: { color: bloom.ink, ...bloom.text.h1, marginTop: bloom.space.md },
  homeBody: { color: bloom.muted, ...bloom.text.body, fontWeight: '600', marginTop: bloom.space.sm },
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: bloom.space.md, marginBottom: bloom.space.lg },
  summaryCard: { padding: bloom.space.xl, marginBottom: bloom.space.lg, gap: bloom.space.lg },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: bloom.space.md },
  summaryEyebrow: { color: bloom.mint, ...bloom.text.eyebrow, textTransform: 'uppercase' },
  summaryStamp: { color: '#d8f6eb', ...bloom.text.small, fontWeight: '900' },
  summaryText: { color: '#ffffff', ...bloom.text.body, fontWeight: '700' },
  shareCta: {
    backgroundColor: bloom.primaryDark,
    borderRadius: bloom.radii.card,
    padding: bloom.space.lg,
    marginBottom: bloom.space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: bloom.space.md,
    minHeight: 76,
    ...bloom.elevation.md,
  },
  shareCtaIcon: { color: '#ffffff', ...bloom.text.eyebrow, textTransform: 'uppercase' },
  shareCtaTitle: { color: '#ffffff', ...bloom.text.title },
  shareCtaSub: { color: '#d7efe6', ...bloom.text.small, marginTop: 2 },
  shareCtaChevron: { color: '#ffffff', fontSize: 24, lineHeight: 28 },
  timelineHeading: { marginTop: bloom.space.sm, marginBottom: bloom.space.md },
  timelineTitle: { color: bloom.ink, ...bloom.text.h2 },
  timelineSub: { color: bloom.muted, ...bloom.text.small, marginTop: bloom.space.xs },
  emptyContainer: { flex: 1 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: { ...bloom.text.h1, color: bloom.ink, marginBottom: bloom.space.md, textAlign: 'center' },
  emptyNote: { ...bloom.text.body, color: bloom.muted, textAlign: 'center', maxWidth: 360 },
  emptyButton: {
    minHeight: 50,
    marginTop: bloom.space.xl,
    backgroundColor: bloom.primary,
    borderRadius: bloom.radii.md,
    paddingHorizontal: bloom.space.xl,
    justifyContent: 'center',
  },
  emptyButtonText: { color: '#ffffff', ...bloom.text.title },
  card: {
    backgroundColor: bloom.surface,
    borderRadius: bloom.radii.card,
    marginBottom: bloom.space.md,
    flexDirection: 'row',
    overflow: 'hidden',
    minHeight: 96,
    borderWidth: 1,
    borderColor: bloom.hair,
    ...bloom.elevation.sm,
  },
  cardAccent: { width: 5 },
  cardBody: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: bloom.space.lg, gap: bloom.space.md },
  fileBadge: {
    minWidth: 48,
    minHeight: 44,
    borderRadius: bloom.radii.sm,
    backgroundColor: bloom.mintSoft,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: bloom.space.sm,
  },
  fileBadgeText: { color: bloom.primaryInk, ...bloom.text.eyebrow },
  cardText: { flex: 1 },
  cardTitle: { ...bloom.text.title, color: bloom.ink },
  cardDate: { ...bloom.text.small, color: bloom.muted, marginTop: bloom.space.xs },
  cardSnippet: { ...bloom.text.small, color: bloom.muted, marginTop: bloom.space.sm },
  chevron: { fontSize: 24, lineHeight: 28, color: '#cad8d2' },
  factTimelineCard: { padding: bloom.space.lg, marginBottom: bloom.space.md },
  factTimelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: bloom.space.md,
    alignItems: 'center',
    marginBottom: bloom.space.md,
  },
  factTimelineLabel: { color: bloom.primaryInk, ...bloom.text.eyebrow, textTransform: 'uppercase' },
  factTimelineLabelDanger: { color: bloom.danger },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: bloom.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...bloom.elevation.lg,
  },
  fabIcon: { fontSize: 30, color: '#ffffff', lineHeight: 34 },
  skeletonWrap: { padding: bloom.space.lg, paddingBottom: 100 },
  skeletonShare: { height: 76, marginBottom: bloom.space.lg },
  skeletonCard: { height: 96, marginBottom: bloom.space.md },
});
