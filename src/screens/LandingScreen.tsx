import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { bloom } from '../../contract/tokens';
import { Card, FadeIn } from '../components/Bloom';

const verbs = [
  {
    title: 'Store',
    body: 'Reports, facts, medicines, allergies, and context stay together in one patient-owned record.',
  },
  {
    title: 'Understand',
    body: 'Plain-language explanations help families ask better questions, without pretending to diagnose.',
  },
  {
    title: 'Share',
    body: 'A doctor gets a clean clinic view through a short-lived link. No login. No data sprawl.',
  },
];

export default function LandingScreen() {
  function openApp() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = '/app';
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <FadeIn style={styles.page}>
        <View style={styles.nav}>
          <Text style={styles.brand}>Bloom OS</Text>
          <Pressable accessibilityRole="button" onPress={openApp} style={styles.navCta}>
            <Text style={styles.navCtaText}>Open app</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.kicker}>The future of healthcare is patient-owned</Text>
            <Text style={styles.title}>
              One health record that families can understand and doctors can trust.
            </Text>
            <Text style={styles.subtitle}>
              Bloom OS turns scattered reports into a calm, shareable clinical view:
              store everything, understand what it means, and share only when you choose.
            </Text>
            <View style={styles.ctaRow}>
              <Pressable accessibilityRole="button" onPress={openApp} style={styles.primaryCta}>
                <Text style={styles.primaryCtaText}>Start with your records</Text>
              </Pressable>
              <Text style={styles.ctaNote}>Built for hospital demos, family care, and doctor handoffs.</Text>
            </View>
          </View>

          <Card style={styles.preview}>
            <View style={styles.previewHeader}>
              <View>
                <Text style={styles.previewName}>Meera Nair</Text>
                <Text style={styles.previewMeta}>Clinic view · shared by patient</Text>
              </View>
              <View style={styles.previewBadge}>
                <Text style={styles.previewBadgeText}>B+</Text>
              </View>
            </View>
            <View style={styles.previewAlert}>
              <Text style={styles.previewAlertLabel}>Allergy alert</Text>
              <Text style={styles.previewAlertText}>Penicillin</Text>
            </View>
            <Text style={styles.previewSummary}>
              HbA1c is a little above the common goal. Discuss target, medication, and retest timing.
            </Text>
          </Card>
        </View>

        <View style={styles.verbGrid}>
          {verbs.map((verb) => (
            <Card key={verb.title} style={styles.verbCard}>
              <Text style={styles.verbTitle}>{verb.title}</Text>
              <Text style={styles.verbBody}>{verb.body}</Text>
            </Card>
          ))}
        </View>

        <Card style={styles.promise}>
          <Text style={styles.promiseTitle}>Privacy promise</Text>
          <Text style={styles.promiseBody}>
            Your record is owned by you. A clinic link works only because you shared it,
            expires quickly, can be revoked, and is shown as an explanation, not medical advice.
          </Text>
        </Card>
      </FadeIn>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: bloom.bg },
  content: { padding: 18, paddingBottom: 42 },
  page: { width: '100%', maxWidth: 1120, alignSelf: 'center' },
  nav: {
    paddingTop: Platform.OS === 'web' ? 18 : 44,
    paddingBottom: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
  },
  brand: { color: bloom.primaryInk, fontSize: 20, fontWeight: '900' },
  navCta: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: bloom.surface,
    borderWidth: 1,
    borderColor: '#D6E8E0',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  navCtaText: { color: bloom.primaryInk, fontSize: 14, fontWeight: '900' },
  hero: {
    minHeight: 520,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    flexWrap: 'wrap',
  },
  heroCopy: { flex: 1.2, minWidth: 310 },
  kicker: {
    color: bloom.primaryInk,
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  title: { color: bloom.ink, fontSize: 54, lineHeight: 60, fontWeight: '900', maxWidth: 760 },
  subtitle: { color: bloom.muted, fontSize: 20, lineHeight: 31, marginTop: 20, maxWidth: 680 },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginTop: 30 },
  primaryCta: {
    minHeight: 52,
    backgroundColor: bloom.primary,
    borderRadius: 14,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  primaryCtaText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  ctaNote: { color: bloom.muted, fontSize: 14, lineHeight: 20, maxWidth: 280 },
  preview: { flex: 0.8, minWidth: 300, padding: 22, gap: 16 },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  previewName: { color: bloom.ink, fontSize: 25, fontWeight: '900' },
  previewMeta: { color: bloom.muted, fontSize: 13, marginTop: 4, fontWeight: '700' },
  previewBadge: { backgroundColor: bloom.accent, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  previewBadgeText: { color: bloom.primaryInk, fontSize: 24, fontWeight: '900' },
  previewAlert: {
    backgroundColor: '#FFF0EE',
    borderColor: bloom.danger,
    borderWidth: 2,
    borderRadius: 16,
    padding: 14,
  },
  previewAlertLabel: { color: bloom.danger, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  previewAlertText: { color: '#7A1E15', fontSize: 19, fontWeight: '900', marginTop: 4 },
  previewSummary: { color: bloom.ink, fontSize: 17, lineHeight: 26, fontWeight: '600' },
  verbGrid: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', marginTop: 20 },
  verbCard: { flex: 1, minWidth: 245, padding: 20 },
  verbTitle: { color: bloom.primaryInk, fontSize: 24, fontWeight: '900', marginBottom: 10 },
  verbBody: { color: bloom.muted, fontSize: 16, lineHeight: 25, fontWeight: '600' },
  promise: { padding: 22, marginTop: 16, marginBottom: 20 },
  promiseTitle: { color: bloom.ink, fontSize: 22, fontWeight: '900', marginBottom: 8 },
  promiseBody: { color: bloom.muted, fontSize: 17, lineHeight: 27, fontWeight: '600' },
});
