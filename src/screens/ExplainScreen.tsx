import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { bloom } from '../../contract/tokens';
import { Card, Disclaimer, ExplainedBadge, FadeIn, GradientPanel, SkeletonBlock, StatusPill } from '../components/Bloom';
import { supabase } from '../lib/supabase';

interface Props {
  recordId: string;
  recordTitle: string;
  onBack: () => void;
}

interface ExplainResult {
  explanation: string;
  doctor_questions: string[];
}

type State =
  | { kind: 'loading' }
  | { kind: 'success'; result: ExplainResult }
  | { kind: 'error'; message: string };

export default function ExplainScreen({ recordId, recordTitle, onBack }: Props) {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function loadOrExplain() {
      const { data: record } = await supabase
        .from('health_records')
        .select('ai_summary, ai_questions, ai_status')
        .eq('id', recordId)
        .single();

      if (cancelled) return;

      if (record?.ai_status === 'done' && record.ai_summary) {
        setState({
          kind: 'success',
          result: {
            explanation: record.ai_summary,
            doctor_questions: record.ai_questions ?? [],
          },
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('explain-report', {
        body: { record_id: recordId },
      });

      if (cancelled) return;

      if (error || !data?.explanation) {
        const message =
          data?.error ??
          error?.message ??
          "Couldn't read this one - try a clearer photo or PDF.";
        setState({ kind: 'error', message });
        return;
      }

      setState({ kind: 'success', result: data as ExplainResult });
    }

    loadOrExplain();
    return () => {
      cancelled = true;
    };
  }, [recordId]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Explain
        </Text>
        <View style={styles.headerRight} />
      </View>

      {state.kind === 'loading' ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={bloom.primary} />
          <Text style={styles.loadingText}>Reading your report...</Text>
          <Text style={styles.loadingSubtext}>Bloom is turning clinical language into plain English.</Text>
          <View style={styles.loaderStack}>
            <SkeletonBlock style={styles.loaderLine} />
            <SkeletonBlock style={styles.loaderLineWide} />
            <SkeletonBlock style={styles.loaderLine} />
          </View>
        </View>
      ) : null}

      {state.kind === 'error' ? (
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Could not read this one</Text>
          <Text style={styles.errorBody}>{state.message}</Text>
          <Pressable accessibilityRole="button" onPress={onBack} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Go back</Text>
          </Pressable>
        </View>
      ) : null}

      {state.kind === 'success' ? (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <FadeIn>
            <Text style={styles.recordTitle}>{recordTitle}</Text>

            <GradientPanel style={styles.heroCard}>
              <StatusPill label="Plain-language AI" tone="dark" />
              <Text style={styles.heroLabel}>What this means</Text>
              <ExplainedBadge />
              <Text style={styles.explanationText}>{state.result.explanation}</Text>
              <Disclaimer />
            </GradientPanel>

            <Card style={styles.card}>
              <Text style={styles.sectionLabel}>Questions to ask your doctor</Text>
              {state.result.doctor_questions.map((q, i) => (
                <View key={q} style={styles.questionRow}>
                  <Text style={styles.questionNumber}>{i + 1}</Text>
                  <Text style={styles.questionText}>{q}</Text>
                </View>
              ))}
            </Card>
          </FadeIn>
        </ScrollView>
      ) : null}
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
  headerTitle: { ...bloom.text.h2, color: bloom.ink, flex: 1, textAlign: 'center' },
  headerRight: { minWidth: 64 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: bloom.space.xxl },
  loadingText: { marginTop: bloom.space.xl, ...bloom.text.h1, color: bloom.ink },
  loadingSubtext: { marginTop: bloom.space.sm, ...bloom.text.small, color: bloom.muted, textAlign: 'center', maxWidth: 360 },
  loaderStack: { width: '100%', maxWidth: 420, marginTop: 28 },
  loaderLine: { height: 18, marginBottom: bloom.space.sm },
  loaderLineWide: { height: 18, marginBottom: bloom.space.sm, width: '86%' },
  errorTitle: { ...bloom.text.h1, color: bloom.ink, marginBottom: bloom.space.sm },
  errorBody: { ...bloom.text.body, color: bloom.muted, textAlign: 'center', marginBottom: bloom.space.xl },
  retryBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: bloom.space.lg },
  retryBtnText: { color: bloom.primaryInk, ...bloom.text.small, fontWeight: '900' },
  scroll: { padding: bloom.space.xl, paddingBottom: 60 },
  recordTitle: { ...bloom.text.h1, color: bloom.ink, marginBottom: bloom.space.lg },
  heroCard: { padding: bloom.space.xl, marginBottom: bloom.space.lg, gap: bloom.space.md },
  card: { padding: bloom.space.xl, marginBottom: bloom.space.lg },
  sectionLabel: {
    ...bloom.text.eyebrow,
    color: bloom.primaryInk,
    textTransform: 'uppercase',
    marginBottom: bloom.space.md,
  },
  heroLabel: { ...bloom.text.h1, color: '#ffffff' },
  explanationText: { ...bloom.text.body, color: '#ffffff', fontWeight: '700' },
  questionRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: bloom.space.lg },
  questionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: bloom.accent,
    color: bloom.primaryInk,
    ...bloom.text.small,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 28,
    marginRight: bloom.space.md,
    overflow: 'hidden',
  },
  questionText: { flex: 1, ...bloom.text.body, color: bloom.ink, fontWeight: '600' },
});
