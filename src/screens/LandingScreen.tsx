import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { bloom } from '../../contract/tokens';
import {
  BloomMark,
  CapabilityCard,
  Card,
  Disclaimer,
  FadeIn,
  GradientPanel,
  MetricTile,
  StatusPill,
} from '../components/Bloom';

const capabilities = [
  {
    eyebrow: 'Patient OS',
    title: 'A lifelong health record, owned by the person.',
    body: 'Reports, medicines, allergies, notes, and context stay together as one portable record the patient can understand.',
  },
  {
    eyebrow: 'AI layer',
    title: 'Clinical language becomes usable language.',
    body: 'Bloom turns reports into plain-English summaries and doctor questions, with every explanation clearly labeled as guidance, not advice.',
  },
  {
    eyebrow: 'Clinic handoff',
    title: 'Doctors open one clean view without a login.',
    body: 'A short-lived link gives a clinician the facts, allergies, report timeline, viewer history, and signed files in seconds.',
  },
  {
    eyebrow: 'Hospital future',
    title: 'The consent layer for modern care networks.',
    body: 'The same primitives can power B2C family care now and B2B hospital workflows later: identity, consent, summaries, audit, and export.',
  },
];

const journey = [
  { step: 'Store', body: 'Everything lands in one calm record.' },
  { step: 'Understand', body: 'Bloom explains what the report says.' },
  { step: 'Share', body: 'Doctor gets the right view, then access expires.' },
];

const privacyPromises = [
  'Your records stay yours.',
  'Bloom explains, never diagnoses.',
  'Export or delete anytime.',
  'Share links expire automatically.',
];

export default function LandingScreen() {
  const { width } = useWindowDimensions();
  const compact = width < 760;

  function openApp() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = '/app';
    }
  }

  function openPatientDemo() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = '/patient';
    }
  }

  function openClinicDemo() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = '/clinic?token=demo';
    }
  }

  function openHospitalPreview() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = '/hospital';
    }
  }

  function openInvestorRoom() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = '/investor';
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <FadeIn style={styles.page}>
        <View style={styles.nav}>
          <View style={styles.brandLockup}>
            <BloomMark />
            <View>
              <Text style={styles.brand}>Bloom OS</Text>
              <Text style={styles.navSub}>Store · Understand · Share</Text>
            </View>
          </View>
          <View style={styles.navActions}>
            <Pressable accessibilityRole="button" onPress={openInvestorRoom} style={styles.navGhost}>
              <Text style={styles.navGhostText}>Investor proof</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={openPatientDemo} style={styles.navGhost}>
              <Text style={styles.navGhostText}>Patient demo</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={openHospitalPreview} style={styles.navGhost}>
              <Text style={styles.navGhostText}>Hospital OS</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={openClinicDemo} style={styles.navGhost}>
              <Text style={styles.navGhostText}>Clinic demo</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={openApp} style={styles.navCta}>
              <Text style={styles.navCtaText}>Open app</Text>
            </Pressable>
          </View>
        </View>

        <GradientPanel style={[styles.hero, compact && styles.heroCompact]}>
          <View style={styles.heroCopy}>
            <StatusPill label="Bloom OS 2035 vision" tone="dark" />
            <Text style={styles.title}>
              Your whole health, finally yours.
            </Text>
            <Text style={styles.subtitle}>
              The patient-owned record layer families love first and hospitals can trust later:
              one calm place to store every report, understand it in plain language, and share it safely.
            </Text>
            <View style={styles.ctaRow}>
              <Pressable accessibilityRole="button" onPress={openPatientDemo} style={styles.primaryCta}>
                <Text style={styles.primaryCtaText}>Enter patient app</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={openClinicDemo} style={styles.secondaryCta}>
                <Text style={styles.secondaryCtaText}>View clinic handoff</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={openHospitalPreview} style={styles.secondaryCta}>
                <Text style={styles.secondaryCtaText}>See hospital OS</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={openInvestorRoom} style={styles.secondaryCta}>
                <Text style={styles.secondaryCtaText}>Open proof room</Text>
              </Pressable>
            </View>
          </View>

          <Card style={styles.preview}>
            <View style={styles.previewTop}>
              <View>
                <Text style={styles.previewLabel}>Live product preview</Text>
                <Text style={styles.previewName}>Meera Nair</Text>
                <Text style={styles.previewMeta}>Patient app · report explained</Text>
              </View>
              <View style={styles.previewBadge}>
                <Text style={styles.previewBadgeText}>B+</Text>
              </View>
            </View>

            <View style={styles.uploadTrack}>
              <View style={styles.uploadTopline}>
                <Text style={styles.uploadLabel}>HbA1c Panel.pdf</Text>
                <Text style={styles.uploadPercent}>100%</Text>
              </View>
              <View style={styles.uploadBar}>
                <View style={styles.uploadFill} />
              </View>
              <Text style={styles.uploadStatus}>Report read</Text>
            </View>

            <View style={styles.metricsRow}>
              <MetricTile label="Facts" value="3" caption="condition, medication, allergy" />
              <MetricTile label="Access" value="60m" caption="expires automatically" tone="gold" />
            </View>

            <View style={styles.previewAlert}>
              <Text style={styles.previewAlertLabel}>Allergy alert</Text>
              <Text style={styles.previewAlertText}>Penicillin · rash</Text>
            </View>

            <View style={styles.timelineMini}>
              <View style={styles.timelineDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.timelineTitle}>HbA1c Panel</Text>
                <Text style={styles.timelineBody}>
                  HbA1c is a little above the common goal. Discuss target, medication, and retest timing.
                </Text>
              </View>
            </View>
            <Disclaimer />
          </Card>
        </GradientPanel>

        <View style={styles.journeyGrid}>
          {journey.map((item, index) => (
            <Card key={item.step} style={styles.journeyCard}>
              <Text style={styles.journeyNumber}>0{index + 1}</Text>
              <Text style={styles.journeyTitle}>{item.step}</Text>
              <Text style={styles.journeyBody}>{item.body}</Text>
            </Card>
          ))}
        </View>

        <View style={styles.sectionIntro}>
          <Text style={styles.sectionEyebrow}>One OS, two markets</Text>
          <Text style={styles.sectionTitle}>A consumer wedge that becomes hospital infrastructure.</Text>
          <Text style={styles.sectionBody}>
            The patient app proves trust and daily utility. The clinic view proves doctor value.
            Together, they become the record exchange hospitals should have had all along.
          </Text>
        </View>

        <View style={styles.capabilityGrid}>
          {capabilities.map((capability) => (
            <CapabilityCard
              key={capability.eyebrow}
              eyebrow={capability.eyebrow}
              title={capability.title}
              body={capability.body}
            />
          ))}
        </View>

        <Card style={styles.systemCard}>
          <View style={styles.systemCopy}>
            <Text style={styles.sectionEyebrow}>Market-ready promise</Text>
            <Text style={styles.systemTitle}>Apple-smooth for families. Clinically legible for doctors.</Text>
            <Text style={styles.systemBody}>
              No noisy portal. No scattered PDFs. No blind sharing. Bloom OS makes the health record feel
              personal, portable, and safe enough to put in front of a hospital buyer.
            </Text>
          </View>
          <View style={styles.systemMetrics}>
            <MetricTile label="Consent" value="Patient-led" caption="share, expire, revoke" />
            <MetricTile label="Trust" value="Audit-ready" caption="view count and history" tone="gold" />
            <MetricTile label="Safety" value="Clear" caption="AI disclaimer everywhere" tone="danger" />
          </View>
        </Card>

        <GradientPanel style={styles.privacyPanel}>
          <View style={styles.privacyCopy}>
            <Text style={styles.privacyEyebrow}>Plain-language privacy promise</Text>
            <Text style={styles.privacyTitle}>Private by default. Shareable by choice.</Text>
            <Text style={styles.privacyBody}>
              Bloom OS should feel as simple as a notes app and as serious as healthcare infrastructure.
              No blind portal, no data guessing, no hidden AI claims.
            </Text>
          </View>
          <View style={styles.promiseGrid}>
            {privacyPromises.map((promise) => (
              <View key={promise} style={styles.promiseRow}>
                <Text style={styles.promiseCheck}>✓</Text>
                <Text style={styles.promiseText}>{promise}</Text>
              </View>
            ))}
          </View>
        </GradientPanel>

        <Card style={styles.accessCard}>
          <View style={styles.accessCopy}>
            <Text style={styles.sectionEyebrow}>Early access</Text>
            <Text style={styles.systemTitle}>Show the future, then let them touch it.</Text>
            <Text style={styles.systemBody}>
              Investors and hospital buyers can move through the same system now:
              patient record, clinic handoff, hospital command center, and proof room.
            </Text>
          </View>
          <View style={styles.accessActions}>
            <Pressable accessibilityRole="button" onPress={openPatientDemo} style={styles.accessPrimary}>
              <Text style={styles.accessPrimaryText}>Run patient demo</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={openInvestorRoom} style={styles.accessSecondary}>
              <Text style={styles.accessSecondaryText}>Open proof room</Text>
            </Pressable>
          </View>
        </Card>

        <View style={styles.footer}>
          <View style={styles.footerBrand}>
            <BloomMark size={32} />
            <View>
              <Text style={styles.footerTitle}>Bloom OS</Text>
              <Text style={styles.footerText}>© 2026 Bloom OS · Store · Understand · Share — owned by you.</Text>
            </View>
          </View>
          <Text style={styles.footerSafety}>✦ The AI explains, never diagnoses.</Text>
        </View>
      </FadeIn>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: bloom.bg },
  content: { padding: bloom.space.xl, paddingBottom: 42 },
  page: { width: '100%', maxWidth: 1180, alignSelf: 'center' },
  nav: {
    paddingTop: Platform.OS === 'web' ? 18 : 44,
    paddingBottom: bloom.space.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: bloom.space.lg,
    flexWrap: 'wrap',
  },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: bloom.space.md },
  brand: { color: bloom.primaryInk, ...bloom.text.h2 },
  navSub: { color: bloom.muted, ...bloom.text.small, marginTop: 2 },
  navActions: { flexDirection: 'row', gap: bloom.space.sm, flexWrap: 'wrap' },
  navGhost: {
    minHeight: 44,
    borderRadius: bloom.radii.md,
    borderWidth: 1,
    borderColor: bloom.mint,
    paddingHorizontal: bloom.space.lg,
    justifyContent: 'center',
  },
  navGhostText: { color: bloom.primaryInk, ...bloom.text.small, fontWeight: '900' },
  navCta: {
    minHeight: 44,
    borderRadius: bloom.radii.md,
    backgroundColor: bloom.surface,
    borderWidth: 1,
    borderColor: bloom.mint,
    paddingHorizontal: bloom.space.lg,
    justifyContent: 'center',
    ...bloom.elevation.sm,
  },
  navCtaText: { color: bloom.primaryInk, ...bloom.text.small, fontWeight: '900' },
  hero: {
    minHeight: 590,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 40,
    flexWrap: 'wrap',
  },
  heroCompact: {
    minHeight: 0,
    padding: bloom.space.xl,
    gap: bloom.space.xl,
  },
  heroCopy: { flex: 1.15, minWidth: 310 },
  title: { color: '#ffffff', fontSize: 44, lineHeight: 50, fontWeight: '900', letterSpacing: 0, maxWidth: 780, marginTop: bloom.space.lg },
  subtitle: { color: '#e4fff5', fontSize: 18, lineHeight: 30, marginTop: bloom.space.xl, maxWidth: 700, fontWeight: '600' },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: bloom.space.md, flexWrap: 'wrap', marginTop: bloom.space.xxl },
  primaryCta: {
    minHeight: 54,
    backgroundColor: '#ffffff',
    borderRadius: bloom.radii.md,
    paddingHorizontal: bloom.space.xl,
    justifyContent: 'center',
  },
  primaryCtaText: { color: bloom.primaryInk, ...bloom.text.title },
  secondaryCta: {
    minHeight: 54,
    borderRadius: bloom.radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: bloom.space.xl,
    justifyContent: 'center',
  },
  secondaryCtaText: { color: '#ffffff', ...bloom.text.title },
  preview: { flex: 0.85, minWidth: 320, padding: bloom.space.xl, gap: bloom.space.lg, ...bloom.elevation.lg },
  previewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: bloom.space.md },
  previewLabel: { color: bloom.primaryInk, ...bloom.text.eyebrow, textTransform: 'uppercase', marginBottom: bloom.space.sm },
  previewName: { color: bloom.ink, ...bloom.text.h1 },
  previewMeta: { color: bloom.muted, ...bloom.text.small, marginTop: bloom.space.xs },
  previewBadge: { backgroundColor: bloom.accent, borderRadius: bloom.radii.md, paddingHorizontal: bloom.space.lg, paddingVertical: bloom.space.md },
  previewBadgeText: { color: bloom.primaryInk, fontSize: 24, lineHeight: 28, fontWeight: '900', letterSpacing: 0 },
  uploadTrack: {
    backgroundColor: bloom.surface2,
    borderRadius: bloom.radii.md,
    borderWidth: 1,
    borderColor: bloom.hair,
    padding: bloom.space.lg,
  },
  uploadTopline: { flexDirection: 'row', justifyContent: 'space-between', gap: bloom.space.md, marginBottom: bloom.space.sm },
  uploadLabel: { color: bloom.ink, ...bloom.text.small, fontWeight: '900' },
  uploadPercent: { color: bloom.primaryInk, ...bloom.text.small, fontWeight: '900' },
  uploadBar: {
    height: 10,
    borderRadius: bloom.radii.pill,
    backgroundColor: bloom.mintSoft,
    overflow: 'hidden',
    marginBottom: bloom.space.sm,
  },
  uploadFill: { width: '100%', height: '100%', backgroundColor: bloom.primary },
  uploadStatus: { color: bloom.primaryInk, ...bloom.text.eyebrow, textTransform: 'uppercase' },
  metricsRow: { flexDirection: 'row', gap: bloom.space.md, flexWrap: 'wrap' },
  previewAlert: {
    backgroundColor: bloom.dangerSoft,
    borderColor: bloom.danger,
    borderWidth: 2,
    borderRadius: bloom.radii.md,
    padding: bloom.space.lg,
  },
  previewAlertLabel: { color: bloom.danger, ...bloom.text.eyebrow, textTransform: 'uppercase' },
  previewAlertText: { color: '#7a1e15', ...bloom.text.h2, marginTop: bloom.space.xs },
  timelineMini: {
    flexDirection: 'row',
    gap: bloom.space.md,
    backgroundColor: bloom.surface2,
    borderRadius: bloom.radii.md,
    padding: bloom.space.lg,
    borderWidth: 1,
    borderColor: bloom.hair,
  },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: bloom.gold, marginTop: 6 },
  timelineTitle: { color: bloom.ink, ...bloom.text.title },
  timelineBody: { color: bloom.muted, ...bloom.text.small, fontWeight: '700', marginTop: bloom.space.xs },
  journeyGrid: { flexDirection: 'row', gap: bloom.space.lg, flexWrap: 'wrap', marginTop: bloom.space.xl },
  journeyCard: { flex: 1, minWidth: 230, padding: bloom.space.xl },
  journeyNumber: { color: bloom.primaryInk, ...bloom.text.eyebrow, marginBottom: bloom.space.sm },
  journeyTitle: { color: bloom.ink, ...bloom.text.h1, marginBottom: bloom.space.sm },
  journeyBody: { color: bloom.muted, ...bloom.text.body, fontWeight: '600' },
  sectionIntro: { marginTop: bloom.space.xxl, marginBottom: bloom.space.lg, maxWidth: 820 },
  sectionEyebrow: { color: bloom.primaryInk, ...bloom.text.eyebrow, textTransform: 'uppercase', marginBottom: bloom.space.sm },
  sectionTitle: { color: bloom.ink, ...bloom.text.display },
  sectionBody: { color: bloom.muted, ...bloom.text.body, fontWeight: '600', marginTop: bloom.space.md },
  capabilityGrid: { flexDirection: 'row', gap: bloom.space.lg, flexWrap: 'wrap' },
  systemCard: {
    padding: bloom.space.xl,
    marginTop: bloom.space.xl,
    marginBottom: bloom.space.xl,
    flexDirection: 'row',
    gap: bloom.space.xl,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  systemCopy: { flex: 1, minWidth: 290 },
  systemTitle: { color: bloom.ink, ...bloom.text.h1, marginBottom: bloom.space.md },
  systemBody: { color: bloom.muted, ...bloom.text.body, fontWeight: '600' },
  systemMetrics: { flex: 1, minWidth: 290, gap: bloom.space.md },
  privacyPanel: {
    padding: bloom.space.xxl,
    marginBottom: bloom.space.xl,
    flexDirection: 'row',
    gap: bloom.space.xl,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  privacyCopy: { flex: 1.2, minWidth: 300 },
  privacyEyebrow: { color: bloom.mint, ...bloom.text.eyebrow, textTransform: 'uppercase', marginBottom: bloom.space.sm },
  privacyTitle: { color: '#ffffff', ...bloom.text.display },
  privacyBody: { color: '#d8f6eb', ...bloom.text.body, fontWeight: '700', marginTop: bloom.space.md },
  promiseGrid: { flex: 0.8, minWidth: 280, gap: bloom.space.md },
  promiseRow: {
    minHeight: 56,
    borderRadius: bloom.radii.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    padding: bloom.space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: bloom.space.md,
  },
  promiseCheck: { color: bloom.mint, ...bloom.text.title },
  promiseText: { color: '#ffffff', ...bloom.text.title, flex: 1 },
  accessCard: {
    padding: bloom.space.xl,
    marginBottom: bloom.space.xl,
    flexDirection: 'row',
    gap: bloom.space.xl,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  accessCopy: { flex: 1, minWidth: 290 },
  accessActions: { flexDirection: 'row', flexWrap: 'wrap', gap: bloom.space.md },
  accessPrimary: {
    minHeight: 50,
    backgroundColor: bloom.primary,
    borderRadius: bloom.radii.md,
    paddingHorizontal: bloom.space.xl,
    justifyContent: 'center',
    ...bloom.elevation.sm,
  },
  accessPrimaryText: { color: '#ffffff', ...bloom.text.title },
  accessSecondary: {
    minHeight: 50,
    backgroundColor: bloom.surface2,
    borderRadius: bloom.radii.md,
    borderWidth: 1,
    borderColor: bloom.hair,
    paddingHorizontal: bloom.space.xl,
    justifyContent: 'center',
  },
  accessSecondaryText: { color: bloom.primaryInk, ...bloom.text.title },
  footer: {
    borderTopWidth: 1,
    borderTopColor: bloom.hair,
    paddingTop: bloom.space.xl,
    paddingBottom: bloom.space.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: bloom.space.lg,
    flexWrap: 'wrap',
  },
  footerBrand: { flexDirection: 'row', alignItems: 'center', gap: bloom.space.md, flex: 1, minWidth: 280 },
  footerTitle: { color: bloom.ink, ...bloom.text.title },
  footerText: { color: bloom.muted, ...bloom.text.small, marginTop: 2 },
  footerSafety: { color: bloom.gold, ...bloom.text.small, fontWeight: '900' },
});
