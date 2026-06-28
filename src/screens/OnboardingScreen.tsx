import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { bloom } from '../../contract/tokens';
import { Button, FadeIn, GradientPanel, Screen, StatusPill } from '../components/Bloom';

interface Props {
  onAddRecord: () => void;
  onContinue: () => void;
}

const steps = [
  {
    title: 'Store',
    body: 'Bring reports, prescriptions, facts, and allergies into one private place you own.',
  },
  {
    title: 'Understand',
    body: 'Bloom explains confusing reports in plain language and gives you questions to ask your doctor.',
  },
  {
    title: 'Share',
    body: 'Show a short-lived QR to a doctor. You stay in control and can revoke access.',
  },
];

export default function OnboardingScreen({ onAddRecord, onContinue }: Props) {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const isLast = index === steps.length - 1;

  return (
    <Screen contentStyle={styles.container}>
      <FadeIn style={styles.wrap}>
        <Text style={styles.brand}>Bloom OS</Text>
        <Text style={styles.headline}>Your health, finally yours and finally clear.</Text>

        <GradientPanel style={styles.card}>
          <StatusPill label="Set up Bloom" tone="dark" />
          <Text style={styles.stepCount}>{index + 1} / {steps.length}</Text>
          <Text style={styles.stepTitle}>{step.title}</Text>
          <Text style={styles.stepBody}>{step.body}</Text>
          <View style={styles.dots}>
            {steps.map((item, dotIndex) => (
              <View key={item.title} style={[styles.dot, dotIndex === index && styles.dotActive]} />
            ))}
          </View>
        </GradientPanel>

        <View style={styles.actions}>
          {isLast ? (
            <>
              <Button label="Add first record" onPress={onAddRecord} />
              <Button label="Use demo view" variant="ghost" onPress={onContinue} />
            </>
          ) : (
            <Button label="Next" onPress={() => setIndex((value) => value + 1)} />
          )}
          <Pressable accessibilityRole="button" onPress={onContinue} style={styles.skip}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </View>
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center' },
  wrap: { width: '100%', maxWidth: 620, alignSelf: 'center' },
  brand: { color: bloom.primaryInk, ...bloom.text.h2, textAlign: 'center', marginBottom: bloom.space.md },
  headline: { color: bloom.ink, ...bloom.text.display, textAlign: 'center', marginBottom: bloom.space.xl },
  card: { padding: bloom.space.xl, minHeight: 300, ...bloom.elevation.md },
  stepCount: { color: bloom.mint, ...bloom.text.eyebrow, textTransform: 'uppercase', marginTop: bloom.space.lg },
  stepTitle: { color: '#ffffff', ...bloom.text.display, marginTop: bloom.space.md },
  stepBody: { color: '#d8f6eb', fontSize: 18, lineHeight: 28, fontWeight: '700', letterSpacing: 0, marginTop: bloom.space.md },
  dots: { flexDirection: 'row', gap: bloom.space.sm, marginTop: bloom.space.xl },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.28)' },
  dotActive: { backgroundColor: '#ffffff' },
  actions: { gap: bloom.space.md, marginTop: bloom.space.lg },
  skip: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  skipText: { color: bloom.muted, ...bloom.text.small, fontWeight: '800' },
});
