import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { deleteHealthFile, getSignedUrl } from '../lib/storage';
import { supabase } from '../lib/supabase';
import type { HealthRecord } from '../types/health';

interface Props {
  recordId: string;
  onBack: () => void;
  onExplain: (recordId: string, recordTitle: string) => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function RecordDetailScreen({ recordId, onBack, onExplain }: Props) {
  const [record, setRecord] = useState<HealthRecord | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data, error: err } = await supabase
        .from('health_records')
        .select('*')
        .eq('id', recordId)
        .single();

      if (err || !data) {
        setError('Could not load this record.');
        setLoading(false);
        return;
      }

      setRecord(data);

      try {
        const url = await getSignedUrl(data.file_path);
        setSignedUrl(url);
      } catch {
        // Non-fatal: metadata still shows even if signed URL fails
      }

      setLoading(false);
    }
    load();
  }, [recordId]);

  function confirmDelete() {
    Alert.alert(
      'Delete this record?',
      'The file and all metadata will be permanently deleted. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDelete },
      ]
    );
  }

  async function handleDelete() {
    if (!record) return;
    setDeleting(true);
    try {
      await deleteHealthFile(record.file_path);
      await supabase.from('health_records').delete().eq('id', record.id);
      onBack();
    } catch (e: any) {
      Alert.alert('Delete failed', e.message ?? 'Please try again.');
      setDeleting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Record</Text>
        <View style={styles.headerRight}>
          {!loading && record && (
            <Pressable onPress={confirmDelete} style={styles.deleteBtn} disabled={deleting}>
              {deleting ? (
                <ActivityIndicator size="small" color="#B91C1C" />
              ) : (
                <Text style={styles.deleteText}>Delete</Text>
              )}
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1F6F54" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={onBack} style={styles.backFallbackBtn}>
            <Text style={styles.backFallbackText}>← Go back</Text>
          </Pressable>
        </View>
      ) : record ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          {record.file_type === 'image' && signedUrl ? (
            <Image
              source={{ uri: signedUrl }}
              style={styles.imagePreview}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.docPreview}>
              <Text style={styles.docIcon}>
                {record.file_type === 'pdf' ? '📄' : '📋'}
              </Text>
              <Text style={styles.docName} numberOfLines={2}>
                {record.file_name}
              </Text>
              {signedUrl && (
                <Pressable
                  style={styles.openBtn}
                  onPress={() => Linking.openURL(signedUrl)}
                >
                  <Text style={styles.openBtnText}>Open File ↗</Text>
                </Pressable>
              )}
            </View>
          )}

          <View style={styles.meta}>
            <Text style={styles.title}>{record.title}</Text>

            {/* Bloom's magic moment — tap to get an AI explanation */}
            <Pressable
              style={styles.explainBtn}
              onPress={() => onExplain(record.id, record.title)}
            >
              <Text style={styles.explainBtnEmoji}>✨</Text>
              <Text style={styles.explainBtnText}>Explain this report</Text>
            </Pressable>

            <View style={styles.row}>
              <Text style={styles.metaLabel}>Date recorded</Text>
              <Text style={styles.metaValue}>{formatDate(record.recorded_at)}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.metaLabel}>Added on</Text>
              <Text style={styles.metaValue}>{formatDate(record.created_at)}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.metaLabel}>File type</Text>
              <Text style={styles.metaValue}>{record.file_type.toUpperCase()}</Text>
            </View>

            {record.notes ? (
              <View style={styles.notesBlock}>
                <Text style={styles.metaLabel}>Notes</Text>
                <Text style={styles.notes}>{record.notes}</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FB' },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#1A2B4A',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  backBtn: { padding: 8, minWidth: 64 },
  backText: { color: '#1F6F54', fontSize: 15, fontWeight: '500' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#111827' },
  headerRight: { minWidth: 64, alignItems: 'flex-end' },
  deleteBtn: { padding: 8 },
  deleteText: { color: '#B91C1C', fontSize: 15, fontWeight: '500' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: '#B91C1C', textAlign: 'center', marginBottom: 16 },
  backFallbackBtn: { paddingVertical: 8 },
  backFallbackText: { color: '#1F6F54', fontSize: 15 },
  scroll: { paddingBottom: 60 },
  imagePreview: {
    width: '100%',
    height: 300,
    backgroundColor: '#111827',
  },
  docPreview: {
    backgroundColor: '#FFFFFF',
    padding: 36,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  docIcon: { fontSize: 60, marginBottom: 14 },
  docName: { fontSize: 14, color: '#374151', textAlign: 'center', marginBottom: 20 },
  openBtn: {
    backgroundColor: '#1F6F54',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  openBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  meta: { padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 16 },
  explainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F6F54',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#1F6F54',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  explainBtnEmoji: { fontSize: 18, marginRight: 10 },
  explainBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', flex: 1 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  metaLabel: { fontSize: 14, color: '#6B7280' },
  metaValue: { fontSize: 14, color: '#111827', fontWeight: '500' },
  notesBlock: { paddingTop: 18 },
  notes: { fontSize: 14, color: '#374151', marginTop: 8, lineHeight: 22 },
});
