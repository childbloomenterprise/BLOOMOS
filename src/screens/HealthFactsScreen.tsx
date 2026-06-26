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
        <Pressable onPress={onBack} style={styles.backBtn}>
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
  const isAllergy = type === 'allergy';

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
          <View key={f.id} style={styles.factRow}>
            <View style={[styles.factDot, isAllergy && styles.factDotAllergy]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.factLabel, isAllergy && styles.factLabelAllergy]}>
                {f.label}
              </Text>
              {f.detail ? <Text style={styles.factDetail}>{f.detail}</Text> : null}
            </View>
            <Pressable onPress={() => onDelete(f.id)} hitSlop={8} style={styles.removeBtn}>
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
  backText: { color: bloom.primary, fontSize: 15, fontWeight: '500' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: bloom.ink },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 60 },
  card: {
    backgroundColor: bloom.surface,
    borderRadius: bloom.radius,
    padding: 18,
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
    color: bloom.primaryInk,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  inputLabel: { fontSize: 13, fontWeight: '500', color: bloom.muted, marginBottom: 6 },
  input: {
    backgroundColor: bloom.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: bloom.ink,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5EFEA',
  },
  primaryBtn: {
    backgroundColor: bloom.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 2,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  emptyText: { fontSize: 14, color: bloom.muted, marginBottom: 12 },
  factRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF4F1',
  },
  factDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: bloom.primary,
    marginRight: 12,
  },
  factDotAllergy: { backgroundColor: bloom.danger },
  factLabel: { fontSize: 15, fontWeight: '600', color: bloom.ink },
  factLabelAllergy: { color: bloom.danger },
  factDetail: { fontSize: 13, color: bloom.muted, marginTop: 2 },
  removeBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  removeText: { fontSize: 13, color: bloom.muted },
  addRow: { marginTop: 12 },
  addInput: { marginBottom: 8 },
  addBtn: {
    backgroundColor: bloom.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addBtnText: { color: bloom.primaryInk, fontSize: 14, fontWeight: '700' },
});
