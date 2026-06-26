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
      // 1. Already explained once? Show the saved result instantly — no AI call.
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

      // 2. Otherwise call the AI. The function persists the result on success,
      //    so the next visit takes the instant path above.
      const { data, error } = await supabase.functions.invoke('explain-report', {
        body: { record_id: recordId },
      });

      if (cancelled) return;

      if (error || !data?.explanation) {
        const message =
          data?.error ??
          error?.message ??
          "Couldn't read this one — try a clearer photo or PDF.";
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
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Explain
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Body */}
      {state.kind === 'loading' && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1F6F54" />
          <Text style={styles.loadingText}>Reading your report…</Text>
          <Text style={styles.loadingSubtext}>This usually takes 5–10 seconds.</Text>
        </View>
      )}

      {state.kind === 'error' && (
        <View style={styles.centered}>
          <Text style={styles.errorEmoji}>🔍</Text>
          <Text style={styles.errorTitle}>Couldn't read this one</Text>
          <Text style={styles.errorBody}>{state.message}</Text>
          <Pressable onPress={onBack} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>← Go back</Text>
          </Pressable>
        </View>
      )}

      {state.kind === 'success' && (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Record title */}
          <Text style={styles.recordTitle}>{recordTitle}</Text>

          {/* Explanation card */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>What this means</Text>
            <Text style={styles.explanationText}>{state.result.explanation}</Text>
          </View>

          {/* Doctor questions card */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Questions to ask your doctor</Text>
            {state.result.doctor_questions.map((q, i) => (
              <View key={i} style={styles.questionRow}>
                <Text style={styles.questionNumber}>{i + 1}</Text>
                <Text style={styles.questionText}>{q}</Text>
              </View>
            ))}
          </View>

          {/* Disclaimer — always visible */}
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerIcon}>ℹ️</Text>
            <Text style={styles.disclaimerText}>
              <Text style={styles.disclaimerStrong}>
                Explanation, not medical advice — discuss with your doctor.
              </Text>
              {'\n'}Please review these results with your doctor before making any decisions.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FB' },

  // Header
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: { minWidth: 64 },

  // Loading
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: {
    marginTop: 20,
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  loadingSubtext: {
    marginTop: 6,
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },

  // Error
  errorEmoji: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  errorBody: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryBtn: { paddingVertical: 8 },
  retryBtnText: { color: '#1F6F54', fontSize: 15, fontWeight: '500' },

  // Scroll content
  scroll: { padding: 20, paddingBottom: 60 },
  recordTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    lineHeight: 28,
  },

  // Cards
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#1A2B4A',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1F6F54',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  // Explanation
  explanationText: {
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 25,
  },

  // Doctor questions
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  questionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E8F5EF',
    color: '#1F6F54',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
    marginTop: 1,
    overflow: 'hidden',
  },
  questionText: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 24,
  },

  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  disclaimerIcon: { fontSize: 16, marginRight: 10, marginTop: 1 },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 20,
    fontWeight: '500',
  },
  disclaimerStrong: { fontWeight: '700' },
});
