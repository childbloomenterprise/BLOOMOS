import React from 'react';
import {
  Animated,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { bloom } from '../../contract/tokens';
import type { ClinicFact, ClinicReport } from '../types/clinic';
import { formatDateLabel, formatExpiresIn } from '../lib/clinicRecord';

export function Card({ children, style }: React.PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function FadeIn({ children, style }: React.PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(8)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

export function FactPill({ fact }: { fact: ClinicFact }) {
  const isAllergy = fact.type === 'allergy';

  return (
    <View style={[styles.factPill, isAllergy && styles.factPillDanger]}>
      <Text style={[styles.factType, isAllergy && styles.factTypeDanger]}>{fact.type}</Text>
      <Text style={[styles.factLabel, isAllergy && styles.factLabelDanger]}>{fact.label}</Text>
      {fact.detail ? (
        <Text style={[styles.factDetail, isAllergy && styles.factDetailDanger]}>{fact.detail}</Text>
      ) : null}
    </View>
  );
}

export function TimelineItem({ report, isLast }: { report: ClinicReport; isLast?: boolean }) {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineRail}>
        <View style={styles.timelineDot} />
        {!isLast ? <View style={styles.timelineLine} /> : null}
      </View>
      <Card style={styles.timelineCard}>
        <View style={styles.timelineHeader}>
          <View>
            <Text style={styles.reportTitle}>{report.title}</Text>
            <Text style={styles.reportMeta}>
              {formatDateLabel(report.recordedAt)} · {report.fileType}
            </Text>
          </View>
          <Text
            accessibilityRole="link"
            style={styles.viewFile}
            onPress={() => {
              if (typeof window !== 'undefined') {
                window.open(report.signedUrl, '_blank', 'noopener,noreferrer');
              }
            }}
          >
            View file
          </Text>
        </View>

        {report.aiSummary ? <Text style={styles.summary}>{report.aiSummary}</Text> : null}

        {report.doctorQuestions.length > 0 ? (
          <View style={styles.questions}>
            <Text style={styles.questionsTitle}>Doctor questions</Text>
            {report.doctorQuestions.map((question) => (
              <Text key={question} style={styles.question}>
                • {question}
              </Text>
            ))}
          </View>
        ) : null}
      </Card>
    </View>
  );
}

export function TrustBar({
  sharedAt,
  expiresAt,
  viewedCount,
  viewerHistory,
}: {
  sharedAt: string;
  expiresAt: string;
  viewedCount: number;
  viewerHistory?: string;
}) {
  return (
    <View style={styles.trustBar}>
      <Text style={styles.trustText}>Shared by the patient</Text>
      <View style={styles.trustDivider} />
      <Text style={styles.trustText}>expires in {formatExpiresIn(expiresAt, new Date(), sharedAt)}</Text>
      <View style={styles.trustDivider} />
      <Text style={styles.trustText}>viewed {viewedCount} times</Text>
      <Text style={styles.sharedAt}>Shared {formatDateLabel(sharedAt)}</Text>
      {viewerHistory ? <Text style={styles.viewerHistory}>{viewerHistory}</Text> : null}
    </View>
  );
}

export function Disclaimer() {
  return (
    <View style={styles.disclaimer}>
      <Text style={styles.disclaimerText}>
        Explanation, not medical advice — discuss with your doctor.
      </Text>
    </View>
  );
}

export function SkeletonBlock({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.skeleton, style]} />;
}

export function ToastBanner({
  message,
  tone = 'success',
}: {
  message: string;
  tone?: 'success' | 'error';
}) {
  return (
    <View style={[styles.toast, tone === 'error' && styles.toastError]}>
      <Text style={[styles.toastText, tone === 'error' && styles.toastTextError]}>{message}</Text>
    </View>
  );
}

const shadow = {
  shadowColor: '#1A2B4A',
  shadowOpacity: 0.07,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 5 },
  elevation: 3,
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: bloom.surface,
    borderRadius: bloom.radius,
    borderWidth: 1,
    borderColor: '#E5EFEA',
    ...shadow,
  },
  factPill: {
    backgroundColor: '#F0F7F4',
    borderColor: '#D6E8E0',
    borderWidth: 1,
    borderRadius: bloom.radius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: 180,
    flexGrow: 1,
    flexBasis: 220,
  },
  factPillDanger: {
    backgroundColor: '#FFF0EE',
    borderColor: bloom.danger,
    borderWidth: 2,
  },
  factType: {
    color: bloom.primaryInk,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  factTypeDanger: { color: bloom.danger },
  factLabel: { color: bloom.ink, fontSize: 16, fontWeight: '800', lineHeight: 22 },
  factLabelDanger: { color: '#7A1E15' },
  factDetail: { color: bloom.muted, fontSize: 14, marginTop: 4, lineHeight: 20 },
  factDetailDanger: { color: '#8F3A31' },
  timelineRow: { flexDirection: 'row', gap: 12 },
  timelineRail: { alignItems: 'center', width: 22 },
  timelineDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: bloom.primary,
    marginTop: 24,
  },
  timelineLine: { flex: 1, width: 2, backgroundColor: '#D8E8E1', marginTop: 6 },
  timelineCard: { flex: 1, padding: 18, marginBottom: 16 },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'flex-start',
  },
  reportTitle: { color: bloom.ink, fontSize: 18, fontWeight: '800', lineHeight: 24 },
  reportMeta: { color: bloom.muted, fontSize: 13, marginTop: 4, textTransform: 'capitalize' },
  viewFile: {
    color: bloom.primaryInk,
    fontSize: 14,
    fontWeight: '800',
    minHeight: 44,
    paddingTop: 2,
  },
  summary: { color: bloom.ink, fontSize: 16, lineHeight: 25, marginTop: 16 },
  questions: {
    backgroundColor: '#F6FAF8',
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E5EFEA',
  },
  questionsTitle: { color: bloom.primaryInk, fontSize: 13, fontWeight: '800', marginBottom: 8 },
  question: { color: bloom.ink, fontSize: 15, lineHeight: 23, marginBottom: 5 },
  trustBar: {
    backgroundColor: bloom.primaryInk,
    borderRadius: bloom.radius,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  trustText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  trustDivider: { width: 4, height: 4, borderRadius: 2, backgroundColor: bloom.accent },
  sharedAt: { color: bloom.accent, fontSize: 12, width: '100%', marginTop: 2 },
  viewerHistory: { color: '#DDF7EC', fontSize: 12, width: '100%', marginTop: 2 },
  disclaimer: {
    backgroundColor: '#FFF8ED',
    borderColor: '#F5D6A3',
    borderWidth: 1,
    borderRadius: bloom.radius,
    padding: 14,
  },
  disclaimerText: { color: '#6F4B12', fontSize: 14, fontWeight: '700', lineHeight: 21 },
  skeleton: {
    backgroundColor: '#E8F2EE',
    borderRadius: bloom.radius,
    minHeight: 16,
  },
  toast: {
    backgroundColor: Platform.OS === 'web' ? '#E9F7F1' : bloom.accent,
    borderColor: '#C7EBDD',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  toastError: {
    backgroundColor: '#FFF0EE',
    borderColor: '#F2C7C0',
  },
  toastText: { color: bloom.primaryInk, fontSize: 14, fontWeight: '800', lineHeight: 20 },
  toastTextError: { color: bloom.danger },
});
