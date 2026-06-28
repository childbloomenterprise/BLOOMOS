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
  Card,
  FadeIn,
  GradientPanel,
  MetricTile,
  StatusPill,
} from '../components/Bloom';
import {
  architectureLoop,
  getInvestorProofSummary,
  investorDemoRoutes,
  investorOperatingModel,
  investorProofCards,
} from './investorData';

function go(path: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.href = path;
  }
}

export default function InvestorScreen() {
  const { width } = useWindowDimensions();
  const compact = width < 820;
  const summary = getInvestorProofSummary();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <FadeIn style={styles.page}>
        <View style={styles.nav}>
          <View style={styles.brandLockup}>
            <BloomMark />
            <View>
              <Text style={styles.brand}>Bloom OS</Text>
              <Text style={styles.navSub}>Investor proof room</Text>
            </View>
          </View>
          <View style={styles.navActions}>
            <Pressable accessibilityRole="button" onPress={() => go('/')} style={styles.navGhost}>
              <Text style={styles.navGhostText}>Vision</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => go('/hospital')} style={styles.navCta}>
              <Text style={styles.navCtaText}>Hospital OS</Text>
            </Pressable>
          </View>
        </View>

        <GradientPanel style={[styles.hero, compact && styles.heroCompact]}>
          <View style={styles.heroCopy}>
            <StatusPill label="Investable product proof" tone="dark" />
            <Text style={styles.heroTitle}>
              Bloom OS is the consent layer between families and hospitals.
            </Text>
            <Text style={styles.heroBody}>
              The demo now proves the wedge, the workflow, and the expansion path:
              patient app, doctor handoff, hospital command center, and trust loop.
            </Text>
            <View style={styles.heroActions}>
              <Pressable accessibilityRole="button" onPress={() => go('/patient')} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Open patient app</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => go('/clinic?token=demo')} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>View clinic demo</Text>
              </Pressable>
            </View>
          </View>
          <Card style={styles.scorecard}>
            <Text style={styles.scoreEyebrow}>Proof surface</Text>
            <Text style={styles.scoreTitle}>Live demo stack</Text>
            <View style={styles.scoreGrid}>
              <MetricTile label="Proofs" value={summary.proofCount} caption="product claims backed by UI" />
              <MetricTile label="Demos" value={summary.demoCount} caption="patient, clinic, hospital" tone="gold" />
              <MetricTile label="Trust" value="Core" caption="consent, revoke, audit" tone="danger" />
            </View>
          </Card>
        </GradientPanel>

        <View style={styles.sectionIntro}>
          <Text style={styles.sectionEyebrow}>Why this can become infrastructure</Text>
          <Text style={styles.sectionTitle}>The product is the thesis.</Text>
          <Text style={styles.sectionBody}>
            Bloom OS does not need hospitals to change behavior on day one. It begins
            where pain already exists: families need records they understand and doctors
            need clean context.
          </Text>
        </View>

        <View style={styles.proofGrid}>
          {investorProofCards.map((card) => (
            <Card key={card.eyebrow} style={styles.proofCard}>
              <Text style={styles.proofEyebrow}>{card.eyebrow}</Text>
              <Text style={styles.proofTitle}>{card.title}</Text>
              <Text style={styles.proofBody}>{card.body}</Text>
            </Card>
          ))}
        </View>

        <Card style={styles.modelCard}>
          <View style={styles.demoHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>Operating model</Text>
              <Text style={styles.demoTitle}>A consumer product that can become hospital infrastructure.</Text>
            </View>
            <StatusPill label="Funding path" tone="gold" />
          </View>
          <View style={styles.modelGrid}>
            {investorOperatingModel.map((item, index) => (
              <View key={item.label} style={styles.modelItem}>
                <Text style={styles.modelIndex}>0{index + 1}</Text>
                <Text style={styles.modelLabel}>{item.label}</Text>
                <Text style={styles.modelValue}>{item.value}</Text>
                <Text style={styles.modelDetail}>{item.detail}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card style={styles.demoCard}>
          <View style={styles.demoHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>Run the proof</Text>
              <Text style={styles.demoTitle}>Three doors into the same system.</Text>
            </View>
            <StatusPill label="Live routes" />
          </View>
          <View style={styles.demoGrid}>
            {investorDemoRoutes.map((route) => (
              <Pressable
                key={route.path}
                accessibilityRole="button"
                onPress={() => go(route.path)}
                style={styles.demoRoute}
              >
                <Text style={styles.demoRouteLabel}>{route.label}</Text>
                <Text style={styles.demoRouteProof}>{route.proof}</Text>
                <Text style={styles.demoRoutePath}>{route.path}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card style={styles.loopCard}>
          <View style={styles.demoHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>Trust loop</Text>
              <Text style={styles.demoTitle}>A record gets more valuable as it moves.</Text>
            </View>
          </View>
          <View style={styles.loop}>
            {architectureLoop.map((item, index) => (
              <View key={item} style={styles.loopStep}>
                <Text style={styles.loopNumber}>0{index + 1}</Text>
                <Text style={styles.loopText}>{item}</Text>
              </View>
            ))}
          </View>
        </Card>
      </FadeIn>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: bloom.bg },
  content: { padding: bloom.space.xl, paddingBottom: 56 },
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
    minHeight: 540,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 40,
    flexWrap: 'wrap',
  },
  heroCompact: { minHeight: 0, padding: bloom.space.xl, gap: bloom.space.xl },
  heroCopy: { flex: 1.1, minWidth: 310 },
  heroTitle: { color: '#ffffff', fontSize: 44, lineHeight: 50, fontWeight: '900', letterSpacing: 0, marginTop: bloom.space.lg },
  heroBody: { color: '#e4fff5', fontSize: 18, lineHeight: 30, fontWeight: '700', marginTop: bloom.space.xl },
  heroActions: { flexDirection: 'row', gap: bloom.space.md, flexWrap: 'wrap', marginTop: bloom.space.xxl },
  primaryButton: {
    minHeight: 54,
    backgroundColor: '#ffffff',
    borderRadius: bloom.radii.md,
    paddingHorizontal: bloom.space.xl,
    justifyContent: 'center',
  },
  primaryButtonText: { color: bloom.primaryInk, ...bloom.text.title },
  secondaryButton: {
    minHeight: 54,
    borderRadius: bloom.radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: bloom.space.xl,
    justifyContent: 'center',
  },
  secondaryButtonText: { color: '#ffffff', ...bloom.text.title },
  scorecard: { flex: 0.85, minWidth: 320, padding: bloom.space.xl, gap: bloom.space.lg, ...bloom.elevation.lg },
  scoreEyebrow: { color: bloom.primaryInk, ...bloom.text.eyebrow, textTransform: 'uppercase' },
  scoreTitle: { color: bloom.ink, ...bloom.text.h1 },
  scoreGrid: { gap: bloom.space.md },
  sectionIntro: { marginTop: bloom.space.xxl, marginBottom: bloom.space.lg, maxWidth: 860 },
  sectionEyebrow: { color: bloom.primaryInk, ...bloom.text.eyebrow, textTransform: 'uppercase', marginBottom: bloom.space.sm },
  sectionTitle: { color: bloom.ink, ...bloom.text.display },
  sectionBody: { color: bloom.muted, ...bloom.text.body, fontWeight: '600', marginTop: bloom.space.md },
  proofGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: bloom.space.lg },
  proofCard: { flex: 1, minWidth: 250, padding: bloom.space.xl },
  proofEyebrow: { color: bloom.primaryInk, ...bloom.text.eyebrow, textTransform: 'uppercase', marginBottom: bloom.space.md },
  proofTitle: { color: bloom.ink, ...bloom.text.h2, marginBottom: bloom.space.sm },
  proofBody: { color: bloom.muted, ...bloom.text.body, fontWeight: '600' },
  modelCard: { padding: bloom.space.xl, marginTop: bloom.space.xl },
  modelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: bloom.space.md },
  modelItem: {
    flex: 1,
    minWidth: 230,
    borderRadius: bloom.radii.md,
    borderWidth: 1,
    borderColor: bloom.mint,
    backgroundColor: bloom.mintSoft,
    padding: bloom.space.lg,
  },
  modelIndex: { color: bloom.primaryInk, ...bloom.text.eyebrow, marginBottom: bloom.space.sm },
  modelLabel: { color: bloom.primaryInk, ...bloom.text.eyebrow, textTransform: 'uppercase', marginBottom: bloom.space.sm },
  modelValue: { color: bloom.ink, ...bloom.text.h2, marginBottom: bloom.space.sm },
  modelDetail: { color: bloom.muted, ...bloom.text.small, fontWeight: '800' },
  demoCard: { padding: bloom.space.xl, marginTop: bloom.space.xl },
  demoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: bloom.space.md,
    flexWrap: 'wrap',
    marginBottom: bloom.space.lg,
  },
  demoTitle: { color: bloom.ink, ...bloom.text.h1 },
  demoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: bloom.space.md },
  demoRoute: {
    flex: 1,
    minWidth: 230,
    minHeight: 150,
    borderRadius: bloom.radii.md,
    borderWidth: 1,
    borderColor: bloom.hair,
    backgroundColor: bloom.surface2,
    padding: bloom.space.lg,
    justifyContent: 'space-between',
  },
  demoRouteLabel: { color: bloom.ink, ...bloom.text.h2 },
  demoRouteProof: { color: bloom.muted, ...bloom.text.small, fontWeight: '700', marginVertical: bloom.space.md },
  demoRoutePath: { color: bloom.primaryInk, ...bloom.text.small, fontWeight: '900' },
  loopCard: { padding: bloom.space.xl, marginTop: bloom.space.lg, marginBottom: bloom.space.xl },
  loop: { flexDirection: 'row', flexWrap: 'wrap', gap: bloom.space.md },
  loopStep: {
    flex: 1,
    minWidth: 190,
    borderRadius: bloom.radii.md,
    borderWidth: 1,
    borderColor: bloom.mint,
    backgroundColor: bloom.mintSoft,
    padding: bloom.space.lg,
  },
  loopNumber: { color: bloom.primaryInk, ...bloom.text.eyebrow, marginBottom: bloom.space.sm },
  loopText: { color: bloom.ink, ...bloom.text.title },
});
