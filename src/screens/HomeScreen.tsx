import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { HealthRecord } from '../types/health';

interface Props {
  onAddRecord: () => void;
  onViewRecord: (id: string) => void;
}

function fileIcon(type: string) {
  if (type === 'image') return '🖼️';
  if (type === 'pdf') return '📄';
  return '📋';
}

function accentColor(type: string) {
  if (type === 'image') return '#3B82F6';
  if (type === 'pdf') return '#EF4444';
  return '#6B7280';
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
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.cardAccent, { backgroundColor: accentColor(record.file_type) }]} />
      <View style={styles.cardBody}>
        <Text style={styles.cardIcon}>{fileIcon(record.file_type)}</Text>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle} numberOfLines={1}>{record.title}</Text>
          <Text style={styles.cardDate}>
            {formatDate(record.recorded_at ?? record.created_at)}
          </Text>
          {explained && (
            <>
              <View style={styles.explainedBadge}>
                <Text style={styles.explainedBadgeText}>✨ Explained</Text>
              </View>
              <Text style={styles.cardSnippet} numberOfLines={2}>
                {record.ai_summary}
              </Text>
            </>
          )}
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen({ onAddRecord, onViewRecord }: Props) {
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
        <Pressable onPress={() => supabase.auth.signOut()} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1F6F54" />
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(r) => r.id}
          contentContainerStyle={
            records.length === 0 ? styles.emptyContainer : styles.list
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1F6F54" />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🌱</Text>
              <Text style={styles.emptyTitle}>No health records yet</Text>
              <Text style={styles.emptyNote}>
                {error ??
                  'Tap + to add your first one — a lab report, prescription, scan, or anything health-related.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <RecordCard record={item} onPress={() => onViewRecord(item.id)} />
          )}
        />
      )}

      <Pressable style={styles.fab} onPress={onAddRecord}>
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FB' },
  header: {
    backgroundColor: '#FFFFFF',
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
  brand: { fontSize: 22, fontWeight: '700', color: '#1F6F54' },
  subtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  logoutBtn: { paddingVertical: 6, paddingHorizontal: 2 },
  logoutText: { color: '#6B7280', fontSize: 14 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 100 },
  emptyContainer: { flex: 1 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 10 },
  emptyNote: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#1A2B4A',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardAccent: { width: 4 },
  cardBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  cardIcon: { fontSize: 24 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  cardDate: { fontSize: 13, color: '#6B7280', marginTop: 3 },
  explainedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5EF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 8,
  },
  explainedBadgeText: { fontSize: 11, fontWeight: '700', color: '#1F6F54' },
  cardSnippet: { fontSize: 12, color: '#6B7280', marginTop: 6, lineHeight: 17 },
  chevron: { fontSize: 22, color: '#D1D5DB' },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1F6F54',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1F6F54',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabIcon: { fontSize: 28, color: '#FFFFFF', lineHeight: 32 },
});
