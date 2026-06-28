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
import { bloom } from '../../contract/tokens';
import { Card, Disclaimer, ExplainedBadge, SkeletonBlock, StatusPill } from '../components/Bloom';
import { deleteHealthFile, getSignedUrl } from '../lib/storage';
import { supabase } from '../lib/supabase';
import type { HealthRecord } from '../types/health';

interface Props {
  recordId: string;
  onBack: () => void;
  onExplain: (recordId: string, recordTitle: string) => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Not dated';
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
        // Non-fatal: metadata still shows even if signed URL fails.
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
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Record</Text>
        <View style={styles.headerRight}>
          {!loading && record ? (
            <Pressable accessibilityRole="button" onPress={confirmDelete} style={styles.deleteBtn} disabled={deleting}>
              {deleting ? (
                <ActivityIndicator size="small" color={bloom.danger} />
              ) : (
                <Text style={styles.deleteText}>Delete</Text>
              )}
            </Pressable>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <SkeletonBlock style={styles.skeletonHero} />
          <SkeletonBlock style={styles.skeletonLine} />
          <SkeletonBlock style={styles.skeletonLineWide} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={onBack} style={styles.backFallbackBtn}>
            <Text style={styles.backFallbackText}>Go back</Text>
          </Pressable>
        </View>
      ) : record ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          {record.file_type === 'image' && signedUrl ? (
            <Image source={{ uri: signedUrl }} style={styles.imagePreview} resizeMode="contain" />
          ) : (
            <Card style={styles.docPreview}>
              <Text style={styles.docIcon}>{record.file_type === 'pdf' ? 'PDF' : 'DOC'}</Text>
              <Text style={styles.docName} numberOfLines={2}>
                {record.file_name}
              </Text>
              {signedUrl ? (
                <Pressable accessibilityRole="button" style={styles.openBtn} onPress={() => Linking.openURL(signedUrl)}>
                  <Text style={styles.openBtnText}>Open File</Text>
                </Pressable>
              ) : null}
            </Card>
          )}

          <View style={styles.meta}>
            <View style={styles.statusRow}>
              <StatusPill label={record.file_type.toUpperCase()} />
              {record.ai_status === 'done' && record.ai_summary ? <ExplainedBadge /> : null}
            </View>
            <Text style={styles.title}>{record.title}</Text>

            <Pressable
              accessibilityRole="button"
              style={styles.explainBtn}
              onPress={() => onExplain(record.id, record.title)}
            >
              <Text style={styles.explainBtnText}>Explain this report</Text>
            </Pressable>

            {record.ai_status === 'done' && record.ai_summary ? (
              <Card style={styles.aiCard}>
                <Text style={styles.aiLabel}>Plain-English explanation</Text>
                <Text style={styles.aiSummary}>{record.ai_summary}</Text>
                <Disclaimer />
              </Card>
            ) : null}

            <InfoRow label="Date recorded" value={formatDate(record.recorded_at)} />
            <InfoRow label="Added on" value={formatDate(record.created_at)} />
            <InfoRow label="File type" value={record.file_type.toUpperCase()} />

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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: bloom.bg },
  header: {
    backgroundColor: bloom.surface,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: bloom.space.lg,
    paddingHorizontal: bloom.space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...bloom.elevation.sm,
  },
  backBtn: { padding: bloom.space.sm, minWidth: 64, minHeight: 44, justifyContent: 'center' },
  backText: { color: bloom.primaryInk, ...bloom.text.small, fontWeight: '900' },
  headerTitle: { ...bloom.text.h2, color: bloom.ink },
  headerRight: { minWidth: 64, alignItems: 'flex-end' },
  deleteBtn: { padding: bloom.space.sm, minHeight: 44, justifyContent: 'center' },
  deleteText: { color: bloom.danger, ...bloom.text.small, fontWeight: '900' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: bloom.space.xl },
  loadingWrap: { padding: bloom.space.xl },
  skeletonHero: { height: 220, marginBottom: bloom.space.xl },
  skeletonLine: { height: 22, marginBottom: bloom.space.md },
  skeletonLineWide: { height: 22, width: '72%' },
  errorText: { color: bloom.danger, textAlign: 'center', marginBottom: bloom.space.lg, ...bloom.text.small, fontWeight: '700' },
  backFallbackBtn: { paddingVertical: bloom.space.sm, minHeight: 44, justifyContent: 'center' },
  backFallbackText: { color: bloom.primaryInk, ...bloom.text.small, fontWeight: '900' },
  scroll: { padding: bloom.space.lg, paddingBottom: 60 },
  imagePreview: { width: '100%', height: 300, backgroundColor: bloom.ink, borderRadius: bloom.radii.card, marginBottom: bloom.space.lg },
  docPreview: { padding: 36, alignItems: 'center', marginBottom: bloom.space.lg },
  docIcon: { fontSize: 30, lineHeight: 36, marginBottom: bloom.space.lg, color: bloom.primaryInk, fontWeight: '900', letterSpacing: 0 },
  docName: { ...bloom.text.small, color: bloom.ink, textAlign: 'center', marginBottom: bloom.space.xl, fontWeight: '700' },
  openBtn: { backgroundColor: bloom.primary, borderRadius: bloom.radii.md, paddingVertical: bloom.space.md, paddingHorizontal: bloom.space.xl, minHeight: 48 },
  openBtnText: { color: '#fff', ...bloom.text.small, fontWeight: '900' },
  meta: { paddingHorizontal: bloom.space.xs },
  statusRow: { flexDirection: 'row', gap: bloom.space.sm, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: bloom.space.md },
  title: { ...bloom.text.h1, color: bloom.ink, marginBottom: bloom.space.lg },
  explainBtn: {
    backgroundColor: bloom.primary,
    borderRadius: bloom.radii.md,
    paddingVertical: bloom.space.lg,
    paddingHorizontal: bloom.space.xl,
    marginBottom: bloom.space.xl,
    minHeight: 54,
    justifyContent: 'center',
    ...bloom.elevation.md,
  },
  explainBtnText: { color: '#ffffff', ...bloom.text.title, textAlign: 'center' },
  aiCard: { padding: bloom.space.xl, marginBottom: bloom.space.lg, borderColor: bloom.goldLine },
  aiLabel: { color: bloom.gold, ...bloom.text.eyebrow, textTransform: 'uppercase', marginBottom: bloom.space.md },
  aiSummary: { color: bloom.ink, ...bloom.text.body, fontWeight: '600', marginBottom: bloom.space.lg },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: bloom.space.lg,
    borderBottomWidth: 1,
    borderBottomColor: bloom.hair,
    gap: bloom.space.lg,
  },
  metaLabel: { ...bloom.text.small, color: bloom.muted, fontWeight: '700' },
  metaValue: { ...bloom.text.small, color: bloom.ink, fontWeight: '800', flexShrink: 1, textAlign: 'right' },
  notesBlock: { paddingTop: bloom.space.lg },
  notes: { ...bloom.text.small, color: bloom.ink, marginTop: bloom.space.sm },
});
