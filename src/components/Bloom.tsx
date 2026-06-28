import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import {
  AccessibilityInfo,
  Animated,
  Modal as RNModal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { bloom } from '../../contract/tokens';
import { formatDateLabel, formatExpiresIn } from '../lib/clinicRecord';
import type { ClinicFact, ClinicReport } from '../types/clinic';

type ButtonVariant = 'primary' | 'ghost' | 'danger';
type Tone = 'mint' | 'gold' | 'danger' | 'dark';

export function BloomMark({ size = 36 }: { size?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        styles.mark,
        {
          width: size,
          height: size,
          borderRadius: Math.max(10, Math.round(size * 0.28)),
        },
      ]}
    >
      <Svg width={Math.round(size * 0.62)} height={Math.round(size * 0.62)} viewBox="0 0 32 32">
        <Path
          d="M16 5c3 2.4 3 7 0 9.4-3-2.4-3-7 0-9.4Zm0 22c-3-2.4-3-7 0-9.4 3 2.4 3 7 0 9.4Zm11-11c-2.4 3-7 3-9.4 0 2.4-3 7-3 9.4 0Zm-22 0c2.4-3 7-3 9.4 0-2.4 3-7 3-9.4 0Z"
          fill="#eafff7"
        />
        <Circle cx="16" cy="16" r="2.4" fill={bloom.mint} />
      </Svg>
    </View>
  );
}

export function Screen({
  children,
  scroll = false,
  style,
  contentStyle,
}: React.PropsWithChildren<{
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}>) {
  if (scroll) {
    return (
      <ScrollView style={[styles.screen, style]} contentContainerStyle={[styles.screenContent, contentStyle]}>
        {children}
      </ScrollView>
    );
  }

  return <View style={[styles.screen, styles.screenContent, style, contentStyle]}>{children}</View>;
}

export function Card({ children, style }: React.PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function GradientPanel({
  children,
  style,
}: React.PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return (
    <LinearGradient colors={bloom.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.gradientPanel, style]}>
      {children}
    </LinearGradient>
  );
}

export function SectionHeader({
  title,
  eyebrow,
  action,
}: {
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action}
    </View>
  );
}

export function StatusPill({ label, tone = 'mint' }: { label: string; tone?: Tone }) {
  return (
    <View style={[styles.statusPill, tone === 'gold' && styles.statusPillGold, tone === 'danger' && styles.statusPillDanger, tone === 'dark' && styles.statusPillDark]}>
      <Text
        style={[
          styles.statusPillText,
          tone === 'gold' && styles.statusPillTextGold,
          tone === 'danger' && styles.statusPillTextDanger,
          tone === 'dark' && styles.statusPillTextDark,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function MetricTile({
  label,
  value,
  caption,
  tone = 'mint',
  style,
}: {
  label: string;
  value: string | number;
  caption?: string;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.metricTile, tone === 'gold' && styles.metricTileGold, tone === 'danger' && styles.metricTileDanger, tone === 'dark' && styles.metricTileDark, style]}>
      <Text style={[styles.metricLabel, tone === 'danger' && styles.metricLabelDanger, tone === 'dark' && styles.metricLabelDark]}>{label}</Text>
      <Text style={[styles.metricValue, tone === 'danger' && styles.metricValueDanger, tone === 'dark' && styles.metricValueDark]}>{value}</Text>
      {caption ? <Text style={[styles.metricCaption, tone === 'danger' && styles.metricCaptionDanger, tone === 'dark' && styles.metricCaptionDark]}>{caption}</Text> : null}
    </View>
  );
}

export function CapabilityCard({
  eyebrow,
  title,
  body,
  style,
}: {
  eyebrow: string;
  title: string;
  body: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Card style={[styles.capabilityCard, style]}>
      <Text style={styles.capabilityEyebrow}>{eyebrow}</Text>
      <Text style={styles.capabilityTitle}>{title}</Text>
      <Text style={styles.capabilityBody}>{body}</Text>
    </Card>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'danger' && styles.buttonDanger,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === 'ghost' && styles.buttonGhostText,
          variant === 'danger' && styles.buttonDangerText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Input({
  label,
  error,
  style,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput {...props} placeholderTextColor={bloom.muted} style={[styles.input, style]} />
      {error ? <Text style={styles.inputError}>{error}</Text> : null}
    </View>
  );
}

export function FadeIn({ children, style }: React.PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(8)).current;

  React.useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((reducedMotion) => {
      if (!mounted) return;
      if (reducedMotion) {
        opacity.setValue(1);
        translateY.setValue(0);
        return;
      }

      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start();
    });

    return () => {
      mounted = false;
    };
  }, [opacity, translateY]);

  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

export function ExplainedBadge({ label = 'Explained' }: { label?: string }) {
  return (
    <View style={styles.explainedBadge}>
      <Text style={styles.explainedBadgeText}>✦ {label}</Text>
    </View>
  );
}

export function FactPill({ fact }: { fact: ClinicFact }) {
  const isAllergy = fact.type === 'allergy';

  return (
    <View style={[styles.factPill, isAllergy && styles.factPillDanger]}>
      <Text style={[styles.factType, isAllergy && styles.factTypeDanger]}>{fact.type}</Text>
      <Text style={[styles.factLabel, isAllergy && styles.factLabelDanger]}>{fact.label}</Text>
      {fact.detail ? <Text style={[styles.factDetail, isAllergy && styles.factDetailDanger]}>{fact.detail}</Text> : null}
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
          <View style={{ flex: 1 }}>
            <Text style={styles.reportTitle}>{report.title}</Text>
            <Text style={styles.reportMeta}>
              {formatDateLabel(report.recordedAt)} · {report.fileType}
            </Text>
          </View>
          <Pressable
            accessibilityRole="link"
            onPress={() => {
              if (typeof window !== 'undefined') {
                window.open(report.signedUrl, '_blank', 'noopener,noreferrer');
              }
            }}
            style={styles.viewFile}
          >
            <Text style={styles.viewFileText}>View file</Text>
          </Pressable>
        </View>

        {report.aiSummary ? (
          <>
            <ExplainedBadge />
            <Text style={styles.summary}>{report.aiSummary}</Text>
          </>
        ) : null}

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
  const viewLabel = viewedCount === 1 ? 'viewed 1 time' : `viewed ${viewedCount} times`;

  return (
    <View style={styles.trustBar}>
      <Text style={styles.trustText}>Shared by the patient</Text>
      <View style={styles.trustDivider} />
      <Text style={styles.trustText}>expires in {formatExpiresIn(expiresAt, new Date(), sharedAt)}</Text>
      <View style={styles.trustDivider} />
      <Text style={styles.trustText}>{viewLabel}</Text>
      <Text style={styles.sharedAt}>Shared {formatDateLabel(sharedAt)}</Text>
      {viewerHistory ? <Text style={styles.viewerHistory}>{viewerHistory}</Text> : null}
    </View>
  );
}

export function Disclaimer() {
  return (
    <View style={styles.disclaimer}>
      <Text style={styles.disclaimerText}>Explanation, not medical advice — discuss with your doctor.</Text>
    </View>
  );
}

export function SkeletonBlock({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.skeleton, style]} />;
}

export const Skeleton = SkeletonBlock;

export function Toast({ message, tone = 'success' }: { message: string; tone?: 'success' | 'error' }) {
  return (
    <View style={[styles.toast, tone === 'error' && styles.toastError]}>
      <Text style={[styles.toastText, tone === 'error' && styles.toastTextError]}>{message}</Text>
    </View>
  );
}

export const ToastBanner = Toast;

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <FadeIn style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} style={styles.emptyAction} /> : null}
    </FadeIn>
  );
}

export function QRBlock({ value, expiresLabel }: { value: string; expiresLabel: string }) {
  const scale = React.useRef(new Animated.Value(0.96)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reducedMotion) => {
      if (!mounted) return;
      if (reducedMotion) {
        scale.setValue(1);
        opacity.setValue(1);
        return;
      }
      Animated.parallel([
        Animated.timing(scale, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 240, useNativeDriver: true }),
      ]).start();
    });
    return () => {
      mounted = false;
    };
  }, [opacity, scale]);

  return (
    <Animated.View style={[styles.qrCard, { opacity, transform: [{ scale }] }]}>
      <QRCode value={value} size={220} color={bloom.ink} backgroundColor={bloom.surface} />
      <View style={styles.expiryPill}>
        <Text style={styles.expiryText}>{expiresLabel}</Text>
      </View>
    </Animated.View>
  );
}

export function Modal({
  visible,
  title,
  body,
  primaryLabel,
  dangerLabel,
  onPrimary,
  onDanger,
  onClose,
}: {
  visible: boolean;
  title: string;
  body: string;
  primaryLabel: string;
  dangerLabel?: string;
  onPrimary: () => void;
  onDanger?: () => void;
  onClose: () => void;
}) {
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Card style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalBody}>{body}</Text>
          <View style={styles.modalActions}>
            <Button label={primaryLabel} onPress={onPrimary} variant="ghost" style={styles.modalButton} />
            {dangerLabel && onDanger ? (
              <Button label={dangerLabel} onPress={onDanger} variant="danger" style={styles.modalButton} />
            ) : null}
          </View>
        </Card>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: bloom.bg },
  screenContent: { padding: bloom.space.xl, paddingBottom: 60, gap: bloom.space.lg },
  mark: {
    backgroundColor: bloom.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    ...bloom.elevation.sm,
  },
  card: {
    backgroundColor: bloom.surface,
    borderRadius: bloom.radii.card,
    borderWidth: 1,
    borderColor: bloom.hair,
    ...bloom.elevation.sm,
  },
  gradientPanel: {
    borderRadius: 30,
    padding: bloom.space.xxl,
    overflow: 'hidden',
    ...bloom.elevation.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: bloom.space.lg,
    marginBottom: bloom.space.md,
  },
  eyebrow: {
    ...bloom.text.eyebrow,
    color: bloom.primaryInk,
    textTransform: 'uppercase',
    marginBottom: bloom.space.xs,
  },
  sectionTitle: { ...bloom.text.h1, color: bloom.ink },
  statusPill: {
    alignSelf: 'flex-start',
    minHeight: 32,
    borderRadius: bloom.radii.pill,
    borderWidth: 1,
    borderColor: bloom.mint,
    backgroundColor: bloom.mintSoft,
    paddingHorizontal: bloom.space.md,
    paddingVertical: bloom.space.xs,
    justifyContent: 'center',
  },
  statusPillGold: {
    backgroundColor: bloom.goldSoft,
    borderColor: bloom.goldLine,
  },
  statusPillDanger: {
    backgroundColor: bloom.dangerSoft,
    borderColor: bloom.dangerLine,
  },
  statusPillDark: {
    backgroundColor: bloom.primaryDark,
    borderColor: bloom.primaryDark,
  },
  statusPillText: { color: bloom.primaryInk, ...bloom.text.eyebrow, textTransform: 'uppercase' },
  statusPillTextGold: { color: bloom.gold },
  statusPillTextDanger: { color: bloom.danger },
  statusPillTextDark: { color: '#ffffff' },
  metricTile: {
    flex: 1,
    minWidth: 150,
    borderRadius: bloom.radii.md,
    borderWidth: 1,
    borderColor: bloom.mint,
    backgroundColor: bloom.mintSoft,
    paddingHorizontal: bloom.space.lg,
    paddingVertical: bloom.space.lg,
  },
  metricTileGold: {
    borderColor: bloom.goldLine,
    backgroundColor: bloom.goldSoft,
  },
  metricTileDanger: {
    borderColor: bloom.danger,
    backgroundColor: bloom.dangerSoft,
  },
  metricTileDark: {
    borderColor: '#2da77e',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  metricLabel: { color: bloom.primaryInk, ...bloom.text.eyebrow, textTransform: 'uppercase', marginBottom: bloom.space.sm },
  metricLabelDanger: { color: bloom.danger },
  metricLabelDark: { color: bloom.mint },
  metricValue: { color: bloom.ink, fontSize: 28, lineHeight: 32, fontWeight: '900', letterSpacing: 0 },
  metricValueDanger: { color: '#7a1e15' },
  metricValueDark: { color: '#ffffff' },
  metricCaption: { color: bloom.muted, ...bloom.text.small, marginTop: bloom.space.xs },
  metricCaptionDanger: { color: '#8f3a31' },
  metricCaptionDark: { color: '#d8f6eb' },
  capabilityCard: {
    flex: 1,
    minWidth: 240,
    padding: bloom.space.xl,
  },
  capabilityEyebrow: { color: bloom.primaryInk, ...bloom.text.eyebrow, textTransform: 'uppercase', marginBottom: bloom.space.md },
  capabilityTitle: { color: bloom.ink, ...bloom.text.h2, marginBottom: bloom.space.sm },
  capabilityBody: { color: bloom.muted, ...bloom.text.body, fontWeight: '600' },
  button: {
    minHeight: 48,
    borderRadius: bloom.radii.md,
    backgroundColor: bloom.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: bloom.space.xl,
    paddingVertical: bloom.space.md,
    ...bloom.elevation.sm,
  },
  buttonGhost: {
    backgroundColor: bloom.surface,
    borderWidth: 1,
    borderColor: '#d6e8e0',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonDanger: {
    backgroundColor: bloom.dangerSoft,
    borderWidth: 1,
    borderColor: bloom.dangerLine,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: { color: '#ffffff', ...bloom.text.title },
  buttonGhostText: { color: bloom.primaryInk },
  buttonDangerText: { color: bloom.danger },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.86 },
  inputWrap: { marginBottom: bloom.space.md },
  inputLabel: { color: bloom.muted, ...bloom.text.small, marginBottom: bloom.space.sm },
  input: {
    minHeight: 50,
    borderRadius: bloom.radii.md,
    borderWidth: 1,
    borderColor: '#dcebe4',
    backgroundColor: bloom.surface2,
    color: bloom.ink,
    ...bloom.text.body,
    paddingHorizontal: bloom.space.lg,
    paddingVertical: bloom.space.md,
  },
  inputError: { color: bloom.danger, ...bloom.text.small, marginTop: bloom.space.xs },
  explainedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: bloom.goldSoft,
    borderColor: bloom.goldLine,
    borderWidth: 1,
    borderRadius: bloom.radii.pill,
    paddingHorizontal: bloom.space.md,
    paddingVertical: bloom.space.xs,
    marginTop: bloom.space.md,
  },
  explainedBadgeText: { color: bloom.gold, ...bloom.text.eyebrow },
  factPill: {
    backgroundColor: bloom.mintSoft,
    borderColor: bloom.mint,
    borderWidth: 1,
    borderRadius: bloom.radii.md,
    paddingHorizontal: bloom.space.lg,
    paddingVertical: bloom.space.md,
    minWidth: 180,
  },
  factPillDanger: {
    backgroundColor: bloom.dangerSoft,
    borderColor: bloom.danger,
    borderWidth: 2,
  },
  factType: { color: bloom.primaryInk, ...bloom.text.eyebrow, textTransform: 'uppercase', marginBottom: bloom.space.sm },
  factTypeDanger: { color: bloom.danger },
  factLabel: { color: bloom.ink, ...bloom.text.title },
  factLabelDanger: { color: '#7a1e15' },
  factDetail: { color: bloom.muted, ...bloom.text.small, marginTop: bloom.space.xs },
  factDetailDanger: { color: '#8f3a31' },
  timelineRow: { flexDirection: 'row', gap: bloom.space.md },
  timelineRail: { alignItems: 'center', width: 22 },
  timelineDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: bloom.primary,
    marginTop: bloom.space.xl,
  },
  timelineLine: { flex: 1, width: 2, backgroundColor: '#d8e8e1', marginTop: bloom.space.sm },
  timelineCard: { flex: 1, padding: bloom.space.xl, marginBottom: bloom.space.lg },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: bloom.space.lg,
    alignItems: 'flex-start',
  },
  reportTitle: { color: bloom.ink, ...bloom.text.h2 },
  reportMeta: { color: bloom.muted, ...bloom.text.small, marginTop: bloom.space.xs, textTransform: 'capitalize' },
  viewFile: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: bloom.space.sm,
  },
  viewFileText: { color: bloom.primaryInk, ...bloom.text.small, fontWeight: '900' },
  summary: { color: bloom.ink, ...bloom.text.body, marginTop: bloom.space.md },
  questions: {
    backgroundColor: bloom.surface2,
    borderRadius: bloom.radii.md,
    padding: bloom.space.lg,
    marginTop: bloom.space.lg,
    borderWidth: 1,
    borderColor: bloom.hair,
  },
  questionsTitle: { color: bloom.primaryInk, ...bloom.text.small, fontWeight: '900', marginBottom: bloom.space.sm },
  question: { color: bloom.ink, ...bloom.text.small, marginBottom: bloom.space.xs },
  trustBar: {
    backgroundColor: bloom.primaryDark,
    borderRadius: bloom.radii.card,
    paddingVertical: bloom.space.lg,
    paddingHorizontal: bloom.space.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: bloom.space.sm,
    ...bloom.elevation.md,
  },
  trustText: { color: '#ffffff', ...bloom.text.small, fontWeight: '900' },
  trustDivider: { width: 4, height: 4, borderRadius: 2, backgroundColor: bloom.accent },
  sharedAt: { color: bloom.accent, ...bloom.text.small, width: '100%', marginTop: bloom.space.xs },
  viewerHistory: { color: '#ddf7ec', ...bloom.text.small, width: '100%', marginTop: bloom.space.xs },
  disclaimer: {
    backgroundColor: '#fff8ed',
    borderColor: bloom.goldLine,
    borderWidth: 1,
    borderRadius: bloom.radii.md,
    padding: bloom.space.lg,
  },
  disclaimerText: { color: '#6f4b12', ...bloom.text.small, fontWeight: '900' },
  skeleton: {
    backgroundColor: '#e8f2ee',
    borderRadius: bloom.radii.card,
    minHeight: 16,
  },
  toast: {
    backgroundColor: Platform.OS === 'web' ? '#e9f7f1' : bloom.accent,
    borderColor: '#c7ebdd',
    borderWidth: 1,
    borderRadius: bloom.radii.md,
    paddingHorizontal: bloom.space.lg,
    paddingVertical: bloom.space.md,
    marginBottom: bloom.space.md,
  },
  toastError: {
    backgroundColor: bloom.dangerSoft,
    borderColor: bloom.dangerLine,
  },
  toastText: { color: bloom.primaryInk, ...bloom.text.small, fontWeight: '900' },
  toastTextError: { color: bloom.danger },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: bloom.space.xxl,
    minHeight: 240,
  },
  emptyTitle: { color: bloom.ink, ...bloom.text.h1, textAlign: 'center', marginBottom: bloom.space.md },
  emptyBody: { color: bloom.muted, ...bloom.text.body, textAlign: 'center', maxWidth: 420 },
  emptyAction: { marginTop: bloom.space.xl },
  qrCard: {
    backgroundColor: bloom.surface,
    borderRadius: bloom.radii.card,
    padding: bloom.space.xl,
    alignItems: 'center',
    marginBottom: bloom.space.xl,
    borderWidth: 1,
    borderColor: bloom.hair,
    ...bloom.elevation.md,
  },
  expiryPill: {
    marginTop: bloom.space.lg,
    backgroundColor: bloom.accent,
    borderRadius: bloom.radii.pill,
    paddingHorizontal: bloom.space.lg,
    paddingVertical: bloom.space.sm,
  },
  expiryText: { color: bloom.primaryInk, ...bloom.text.small, fontWeight: '900' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(14,42,34,0.36)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: bloom.space.xl,
  },
  modalCard: { width: '100%', maxWidth: 460, padding: bloom.space.xl },
  modalTitle: { color: bloom.ink, ...bloom.text.h1, marginBottom: bloom.space.sm },
  modalBody: { color: bloom.muted, ...bloom.text.body, marginBottom: bloom.space.lg },
  modalActions: { flexDirection: 'row', gap: bloom.space.md, justifyContent: 'flex-end', flexWrap: 'wrap' },
  modalButton: { minWidth: 120 },
});
