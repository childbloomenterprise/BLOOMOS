import React, { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { bloom } from '../../contract/tokens';
import { Button, Card, GradientPanel, MetricTile, Modal, Screen, SectionHeader, StatusPill } from '../components/Bloom';
import { deleteAccount, exportData } from '../lib/privacy';

interface Props {
  onBack: () => void;
}

export default function SettingsScreen({ onBack }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const bundle = await exportData();
      const json = JSON.stringify(bundle, null, 2);

      if (typeof window !== 'undefined' && typeof Blob !== 'undefined') {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `bloom-os-export-${bundle.exportedAt.slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        await Clipboard.setStringAsync(json);
      }

      Alert.alert('Export ready', 'Your Bloom OS data export is ready.');
    } catch (e: any) {
      Alert.alert('Export failed', e.message ?? 'Please try again.');
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteAccount();
      setConfirmDelete(false);
      Alert.alert('Account deleted', 'Your Bloom OS account and data were deleted.');
      onBack();
    } catch (e: any) {
      Alert.alert('Delete failed', e.message ?? 'Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Settings & privacy</Text>
        <View style={{ width: 64 }} />
      </View>

      <GradientPanel style={styles.hero}>
        <StatusPill label="Privacy control plane" tone="dark" />
        <Text style={styles.heroTitle}>Your record stays yours, even when care gets complex.</Text>
        <Text style={styles.heroBody}>
          Bloom OS is built around consent, short-lived sharing, exportability, and clear deletion.
        </Text>
        <View style={styles.metricRow}>
          <MetricTile label="Share" value="Revoke" caption="clinic links can be stopped" tone="dark" />
          <MetricTile label="Data" value="Export" caption="portable JSON bundle" tone="dark" />
        </View>
      </GradientPanel>

      <Card style={styles.card}>
        <SectionHeader title="Privacy promise" eyebrow="Plain language" />
        <Text style={styles.body}>
          Bloom OS keeps your health record patient-owned. Clinic links are short-lived,
          revocable, and built for one handoff at a time. AI explanations help you ask
          better questions; they do not replace your doctor.
        </Text>
      </Card>

      <Card style={styles.card}>
        <SectionHeader title="Your data" eyebrow="Control" />
        <Text style={styles.body}>
          You can take your information with you, and sensitive account actions ask for
          clear confirmation before anything changes.
        </Text>
        <View style={styles.actions}>
          <Button
            label={exporting ? 'Exporting...' : 'Export all my data'}
            variant="ghost"
            disabled={exporting}
            onPress={handleExport}
          />
          <Button
            label={deleting ? 'Deleting...' : 'Delete my account'}
            variant="danger"
            disabled={deleting}
            onPress={() => setConfirmDelete(true)}
          />
        </View>
      </Card>

      <Card style={styles.card}>
        <SectionHeader title="About" eyebrow="Bloom OS" />
        <Text style={styles.body}>
          Store → Understand → Share. Built for calm family care and fast clinical handoffs.
        </Text>
      </Card>

      <Modal
        visible={confirmDelete}
        title="Delete account?"
        body="This is permanent and deletes your account, records, facts, shares, and files."
        primaryLabel="Cancel"
        dangerLabel={deleting ? 'Deleting...' : 'Delete account'}
        onPrimary={() => setConfirmDelete(false)}
        onDanger={handleDeleteAccount}
        onClose={() => setConfirmDelete(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: bloom.space.lg,
    paddingTop: bloom.space.xl,
  },
  backBtn: { minWidth: 64, minHeight: 44, justifyContent: 'center' },
  backText: { color: bloom.primaryInk, ...bloom.text.small, fontWeight: '900' },
  title: { color: bloom.ink, ...bloom.text.h2 },
  hero: { padding: bloom.space.xl, marginBottom: bloom.space.lg, gap: bloom.space.md },
  heroTitle: { color: '#ffffff', ...bloom.text.h1 },
  heroBody: { color: '#d8f6eb', ...bloom.text.body, fontWeight: '700' },
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: bloom.space.md },
  card: { padding: bloom.space.xl, marginBottom: bloom.space.lg },
  body: { color: bloom.muted, ...bloom.text.body, fontWeight: '600' },
  actions: { gap: bloom.space.md, marginTop: bloom.space.lg },
});
