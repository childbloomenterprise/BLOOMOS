import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { bloom } from '../../contract/tokens';
import { FadeIn, SkeletonBlock, ToastBanner } from '../components/Bloom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { HealthRecord } from '../types/health';

interface Props {
  onAddRecord: () => void;
  onViewRecord: (id: string) => void;
  onOpenFacts: () => void;
  onOpenShare: () => void;
  toast?: string | null;
  onToastDone?: () => void;
}

function fileLabel(type: string) {
  if (type === 'image') return 'Image';
  if (type === 'pdf') return 'PDF';
  return 'Doc';
}

function accentColor(type: string) {
  if (type === 'image') return '#2F80ED';
  if (type === 'pdf') return bloom.danger;
  return bloom.muted;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function RecordCard({
  record,
  onPress,
}: {
  record: HealthRecord;
  onPress: () => void;
}) {
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
              <View style={styles.explainedBadge}>
                <Text style={styles.explainedBadgeText}>Explained</Text>
              </View>
              <Text style={styles.cardSnippet} numberOfLines={2}>
                {record.ai_summary}
              </Text>
            </>
          ) : null}
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen({
  onAddRecord,
  onViewRecord,
  onOpenFacts,
  onOpenShare,
  toast,
  onToastDone,
}: Props) {
  const { session } = useAuth();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchRecords() {
    setError(null);
    const { data, error: err } = await supabase
      .from('health_records')
      .select('*')
      .eq('user_id', session!.user.id)
      .order('created_at', { ascending: false });

    if (err) {
      setError('Could not load records. Pull down to retry.');
    } else {
      setRecords(data ?? []);
    }
  }

  useEffect(() => {
    fetchRecords().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!toast || !onToastDone) return;
    const id = setTimeout(onToastDone, 3200);
    return () => clearTimeout(id);
  }, [toast, onToastDone]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRecords();
    setRefreshing(false);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>Bloom OS</Text>
          <Text style={styles.subtitle}>Your health, owned by you.</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable accessibilityRole="button" onPress={onOpenFacts} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>My Health</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => supabase.auth.signOut()}
            style={styles.logoutBtn}
          >
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <HomeSkeleton />
      ) : (
        <FlatList
          data={records}
          keyExtractor={(r) => r.id}
          contentContainerStyle={records.length === 0 ? styles.emptyContainer : styles.list}
          ListHeaderComponent={
            <>
              {toast ? <ToastBanner message={toast} /> : null}
              {records.length > 0 ? (
                <FadeIn>
                  <Pressable accessibilityRole="button" style={styles.shareCta} onPress={onOpenShare}>
                    <Text style={styles.shareCtaIcon}>Share</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shareCtaTitle}>Share with a doctor</Text>
                      <Text style={styles.shareCtaSub}>Show a QR - expires in 60 min</Text>
                    </View>
                    <Text style={styles.shareCtaChevron}>›</Text>
                  </Pressable>
                </FadeIn>
              ) : null}
            </>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={bloom.primary} />
          }
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
              <RecordCard record={item} onPress={() => onViewRecord(item.id)} />
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
    paddingBottom: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    shadowColor: '#1A2B4A',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  brand: { fontSize: 23, fontWeight: '900', color: bloom.primaryInk },
  subtitle: { fontSize: 13, color: bloom.muted, marginTop: 2, fontWeight: '600' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerBtn: {
    backgroundColor: bloom.accent,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  headerBtnText: { color: bloom.primaryInk, fontSize: 13, fontWeight: '800' },
  logoutBtn: { paddingVertical: 8, paddingHorizontal: 4, minHeight: 44, justifyContent: 'center' },
  logoutText: { color: bloom.muted, fontSize: 14, fontWeight: '600' },
  list: { padding: 16, paddingBottom: 100 },
  shareCta: {
    backgroundColor: bloom.primaryInk,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 76,
    shadowColor: bloom.primaryInk,
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  shareCtaIcon: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  shareCtaTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  shareCtaSub: { color: '#D7EFE6', fontSize: 13, marginTop: 2, fontWeight: '600' },
  shareCtaChevron: { color: '#FFFFFF', fontSize: 24 },
  emptyContainer: { flex: 1 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: { fontSize: 24, fontWeight: '900', color: bloom.ink, marginBottom: 10, textAlign: 'center' },
  emptyNote: { fontSize: 16, color: bloom.muted, textAlign: 'center', lineHeight: 25, maxWidth: 360 },
  emptyButton: {
    minHeight: 50,
    marginTop: 20,
    backgroundColor: bloom.primary,
    borderRadius: 14,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  emptyButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  card: {
    backgroundColor: bloom.surface,
    borderRadius: 14,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    minHeight: 96,
    shadowColor: '#1A2B4A',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardAccent: { width: 5 },
  cardBody: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  fileBadge: {
    minWidth: 48,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#F0F7F4',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  fileBadgeText: { color: bloom.primaryInk, fontSize: 12, fontWeight: '900' },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: bloom.ink },
  cardDate: { fontSize: 14, color: bloom.muted, marginTop: 3, fontWeight: '600' },
  explainedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: bloom.accent,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 8,
  },
  explainedBadgeText: { fontSize: 11, fontWeight: '900', color: bloom.primaryInk },
  cardSnippet: { fontSize: 13, color: bloom.muted, marginTop: 6, lineHeight: 19 },
  chevron: { fontSize: 24, color: '#CAD8D2' },
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
    shadowColor: bloom.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabIcon: { fontSize: 30, color: '#FFFFFF', lineHeight: 34 },
  skeletonWrap: { padding: 16, paddingBottom: 100 },
  skeletonShare: { height: 76, marginBottom: 14 },
  skeletonCard: { height: 96, marginBottom: 12 },
});
