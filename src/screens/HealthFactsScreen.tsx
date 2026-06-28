import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { bloom } from '../../contract/tokens';
import { Card, FactPill, MetricTile, StatusPill } from '../components/Bloom';
import { useAuth } from '../context/AuthContext';
import { addFact, deleteFact, getProfile, listFacts, updateProfile } from '../lib/facts';
import type { FactType, HealthFact, Profile } from '../types/facts';

interface Props {
  onBack: () => void;
}

const FACT_GROUPS: { type: FactType; title: string; addLabel: string }[] = [
  { type: 'condition', title: 'Conditions', addLabel: 'Add a condition' },
  { type: 'medication', title: 'Medications', addLabel: 'Add a medication' },
  { type: 'allergy', title: 'Allergies', addLabel: 'Add an allergy' },
];

export default function HealthFactsScreen({ onBack }: Props) {
  const { session } = useAuth();
  const userId = session!.user.id;

  const [loading, setLoading] = useState(true);
  const [facts, setFacts] = useState<HealthFact[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Profile edit fields
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const conditionCount = facts.filter((fact) => fact.type === 'condition').length;
  const medicationCount = facts.filter((fact) => fact.type === 'medication').length;
  const allergyCount = facts.filter((fact) => fact.type === 'allergy').length;

  useEffect(() => {
    (async () => {
      try {
        const [p, f] = await Promise.all([getProfile(userId), listFacts()]);
        setProfile(p);
        setFullName(p?.full_name ?? '');
        setDob(p?.dob ?? '');
        setBloodType(p?.blood_type ?? '');
        setFacts(f);
      } catch {
        Alert.alert('Could not load', 'Pull back and try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  async function handleSaveProfile() {
    if (dob.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(dob.trim())) {
      Alert.alert('Check the date', 'Date of birth must be YYYY-MM-DD (e.g. 1989-03-14).');
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile(userId, {
        full_name: fullName.trim() || null,
        dob: dob.trim() || null,
        blood_type: bloodType.trim() || null,
      });
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (e: any) {
      Alert.alert('Save failed', e.message ?? 'Please try again.');
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>My Health</Text>
        <View style={{ width: 64 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={bloom.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Card style={styles.heroCard}>
            <StatusPill label="Patient facts" />
            <Text style={styles.heroTitle}>The context doctors ask for first.</Text>
            <Text style={styles.heroBody}>
              Keep conditions, medications, allergies, and identity details ready before a clinic handoff.
            </Text>
            <View style={styles.metricRow}>
              <MetricTile label="Conditions" value={conditionCount} caption="ongoing context" />
              <MetricTile label="Meds" value={medicationCount} caption="current medicines" />
              <MetricTile label="Allergies" value={allergyCount} caption="flagged red" tone={allergyCount > 0 ? 'danger' : 'mint'} />
            </View>
          </Card>

          {/* Profile */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Profile</Text>

            <Text style={styles.inputLabel}>Full name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="e.g. Meera Nair"
              placeholderTextColor={bloom.muted}
            />

            <Text style={styles.inputLabel}>Date of birth</Text>
            <TextInput
              style={styles.input}
              value={dob}
              onChangeText={setDob}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={bloom.muted}
              keyboardType="numbers-and-punctuation"
            />

            <Text style={styles.inputLabel}>Blood type</Text>
            <TextInput
              style={styles.input}
              value={bloodType}
              onChangeText={setBloodType}
              placeholder="e.g. B+"
              placeholderTextColor={bloom.muted}
              autoCapitalize="characters"
            />

            <Pressable
              accessibilityRole="button"
              style={[styles.primaryBtn, savingProfile && styles.btnDisabled]}
              onPress={handleSaveProfile}
              disabled={savingProfile}
            >
              {savingProfile ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Save profile</Text>
              )}
            </Pressable>
          </View>

          {/* Fact groups */}
          {FACT_GROUPS.map((group) => (
            <FactGroup
              key={group.type}
              type={group.type}
              title={group.title}
              addLabel={group.addLabel}
              facts={facts.filter((f) => f.type === group.type)}
              onAdd={async (label, detail) => {
                const created = await addFact(userId, group.type, label, detail);
                setFacts((prev) => [...prev, created]);
              }}
              onDelete={async (id) => {
                await deleteFact(id);
                setFacts((prev) => prev.filter((f) => f.id !== id));
              }}
            />
          ))}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

function FactGroup({
  type,
  title,
  addLabel,
  facts,
  onAdd,
  onDelete,
}: {
  type: FactType;
  title: string;
  addLabel: string;
  facts: HealthFact[];
  onAdd: (label: string, detail: string | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [label, setLabel] = useState('');
  const [detail, setDetail] = useState('');
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!label.trim()) return;
    setAdding(true);
    try {
      await onAdd(label.trim(), detail.trim() || null);
      setLabel('');
      setDetail('');
    } catch (e: any) {
      Alert.alert('Could not add', e.message ?? 'Please try again.');
    } finally {
      setAdding(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>{title}</Text>

      {facts.length === 0 ? (
        <Text style={styles.emptyText}>None added yet.</Text>
      ) : (
        facts.map((f) => (
          <View key={f.id} style={styles.factPillRow}>
            <View style={{ flex: 1 }}>
              <FactPill fact={{ type: f.type, label: f.label, detail: f.detail }} />
            </View>
            <Pressable accessibilityRole="button" onPress={() => onDelete(f.id)} hitSlop={8} style={styles.removeBtn}>
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
        ))
      )}

      <View style={styles.addRow}>
        <TextInput
          style={[styles.input, styles.addInput]}
          value={label}
          onChangeText={setLabel}
          placeholder={addLabel}
          placeholderTextColor={bloom.muted}
        />
        <TextInput
          style={[styles.input, styles.addInput]}
          value={detail}
          onChangeText={setDetail}
          placeholder="Detail (optional)"
          placeholderTextColor={bloom.muted}
        />
        <Pressable
          accessibilityRole="button"
          style={[styles.addBtn, (adding || !label.trim()) && styles.btnDisabled]}
          onPress={handleAdd}
          disabled={adding || !label.trim()}
        >
          <Text style={styles.addBtnText}>{adding ? '…' : '+ Add'}</Text>
        </Pressable>
      </View>
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
  backText: { color: bloom.primary, ...bloom.text.small, fontWeight: '900' },
  headerTitle: { ...bloom.text.h2, color: bloom.ink },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: bloom.space.lg, paddingBottom: 60 },
  heroCard: { padding: bloom.space.xl, marginBottom: bloom.space.lg },
  heroTitle: { color: bloom.ink, ...bloom.text.h1, marginTop: bloom.space.md },
  heroBody: { color: bloom.muted, ...bloom.text.body, fontWeight: '600', marginTop: bloom.space.sm, marginBottom: bloom.space.lg },
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: bloom.space.md },
  card: {
    backgroundColor: bloom.surface,
    borderRadius: bloom.radii.card,
    padding: bloom.space.xl,
    marginBottom: bloom.space.lg,
    borderWidth: 1,
    borderColor: bloom.hair,
    ...bloom.elevation.sm,
  },
  sectionLabel: {
    ...bloom.text.eyebrow,
    color: bloom.primaryInk,
    textTransform: 'uppercase',
    marginBottom: bloom.space.md,
  },
  inputLabel: { ...bloom.text.small, fontWeight: '700', color: bloom.muted, marginBottom: bloom.space.sm },
  input: {
    backgroundColor: bloom.bg,
    borderRadius: bloom.radii.md,
    paddingHorizontal: bloom.space.lg,
    paddingVertical: bloom.space.md,
    ...bloom.text.small,
    color: bloom.ink,
    marginBottom: bloom.space.md,
    borderWidth: 1,
    borderColor: bloom.hair,
  },
  primaryBtn: {
    backgroundColor: bloom.primary,
    borderRadius: bloom.radii.md,
    paddingVertical: bloom.space.lg,
    alignItems: 'center',
    marginTop: 2,
    minHeight: 50,
    justifyContent: 'center',
    ...bloom.elevation.sm,
  },
  primaryBtnText: { color: '#fff', ...bloom.text.small, fontWeight: '900' },
  btnDisabled: { opacity: 0.5 },
  emptyText: { ...bloom.text.small, color: bloom.muted, marginBottom: bloom.space.md },
  factPillRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: bloom.space.md,
    marginBottom: bloom.space.md,
  },
  removeBtn: { paddingHorizontal: bloom.space.sm, paddingVertical: bloom.space.xs, minHeight: 44, justifyContent: 'center' },
  removeText: { ...bloom.text.small, color: bloom.muted },
  addRow: { marginTop: bloom.space.md },
  addInput: { marginBottom: bloom.space.sm },
  addBtn: {
    backgroundColor: bloom.accent,
    borderRadius: bloom.radii.md,
    paddingVertical: bloom.space.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  addBtnText: { color: bloom.primaryInk, ...bloom.text.small, fontWeight: '900' },
});
