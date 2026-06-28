import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { Card, FadeIn, GradientPanel, StatusPill } from '../components/Bloom';
import { useAuth } from '../context/AuthContext';
import { uploadHealthFile } from '../lib/storage';
import { supabase } from '../lib/supabase';
import type { FileType } from '../types/health';

interface Props {
  onDone: () => void;
  onBack: () => void;
}

interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size: number | null;
  type: FileType;
}

function resolveFileType(mimeType: string): FileType {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  return 'document';
}

export default function UploadScreen({ onDone, onBack }: Props) {
  const { session } = useAuth();
  const [picked, setPicked] = useState<PickedFile | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [recordedAt, setRecordedAt] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickFromCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera access in Settings to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setPicked({
        uri: asset.uri,
        name: asset.fileName ?? `photo_${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? 'image/jpeg',
        size: asset.fileSize ?? null,
        type: 'image',
      });
    }
  }

  async function pickFromGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setPicked({
        uri: asset.uri,
        name: asset.fileName ?? `image_${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? 'image/jpeg',
        size: asset.fileSize ?? null,
        type: 'image',
      });
    }
  }

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'image/*',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const mimeType = asset.mimeType ?? 'application/octet-stream';
      setPicked({
        uri: asset.uri,
        name: asset.name,
        mimeType,
        size: asset.size ?? null,
        type: resolveFileType(mimeType),
      });
    }
  }

  async function handleUpload() {
    if (!picked) return;

    if (!title.trim()) {
      setError('Please give this record a title.');
      return;
    }

    let parsedDate: string | null = null;
    if (recordedAt.trim()) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(recordedAt.trim())) {
        setError('Date must be YYYY-MM-DD format (e.g. 2024-03-15).');
        return;
      }
      parsedDate = recordedAt.trim();
    }

    setError(null);
    setUploading(true);

    try {
      const userId = session!.user.id;
      const filePath = await uploadHealthFile(userId, picked.uri, picked.name, picked.mimeType);

      const { error: dbError } = await supabase.from('health_records').insert({
        user_id: userId,
        title: title.trim(),
        notes: notes.trim() || null,
        file_path: filePath,
        file_type: picked.type,
        file_name: picked.name,
        file_size: picked.size,
        recorded_at: parsedDate,
      });

      if (dbError) throw dbError;
      onDone();
    } catch (e: any) {
      setError(e.message ?? 'Upload failed. Check your connection and try again.');
      setUploading(false);
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
        <Text style={styles.headerTitle}>Add Health Record</Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <GradientPanel style={styles.uploadHero}>
          <StatusPill label="Patient vault" tone="dark" />
          <Text style={styles.heroTitle}>Add one record. Build a lifelong handoff.</Text>
          <Text style={styles.heroSub}>
            Upload a report now. You can ask Bloom to explain it right after it saves,
            then share a clinic-ready view when you need care.
          </Text>
        </GradientPanel>

        {!picked ? (
          <FadeIn>
            <Text style={styles.sectionLabel}>Choose file source</Text>

            {Platform.OS !== 'web' ? (
              <SourceButton label="Camera" title="Take Photo" body="Open camera to photograph a document" onPress={pickFromCamera} />
            ) : null}

            <SourceButton label="Image" title="Choose from Gallery" body="Pick a photo already on your device" onPress={pickFromGallery} />
            <SourceButton label="File" title="Upload Document" body="PDF, Word, or text file" onPress={pickDocument} />
          </FadeIn>
        ) : (
          <FadeIn>
            <Card style={styles.previewCard}>
              {picked.type === 'image' ? (
                <Image source={{ uri: picked.uri }} style={styles.preview} resizeMode="cover" />
              ) : (
                <View style={styles.filePreview}>
                  <Text style={styles.filePreviewIcon}>{picked.type === 'pdf' ? 'PDF' : 'DOC'}</Text>
                  <Text style={styles.filePreviewName} numberOfLines={2}>
                    {picked.name}
                  </Text>
                </View>
              )}
              <Pressable accessibilityRole="button" style={styles.changeBtn} onPress={() => setPicked(null)}>
                <Text style={styles.changeBtnText}>Change file</Text>
              </Pressable>
            </Card>
          </FadeIn>
        )}

        {picked ? (
          <FadeIn>
            <Card style={styles.formCard}>
              <Text style={styles.sectionLabel}>Record details</Text>

              <Text style={styles.inputLabel}>Title <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Blood test results, March 2025"
                placeholderTextColor={bloom.muted}
                value={title}
                onChangeText={setTitle}
                editable={!uploading}
                returnKeyType="next"
              />

              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Any context about this record..."
                placeholderTextColor={bloom.muted}
                multiline
                value={notes}
                onChangeText={setNotes}
                editable={!uploading}
              />

              <Text style={styles.inputLabel}>Date recorded</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD  e.g. 2025-03-15"
                placeholderTextColor={bloom.muted}
                value={recordedAt}
                onChangeText={setRecordedAt}
                editable={!uploading}
                keyboardType="numbers-and-punctuation"
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Pressable
                accessibilityRole="button"
                style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]}
                onPress={handleUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.uploadBtnText}>Uploading...</Text>
                  </>
                ) : (
                  <Text style={styles.uploadBtnText}>Save Record</Text>
                )}
              </Pressable>
            </Card>
          </FadeIn>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SourceButton({
  label,
  title,
  body,
  onPress,
}: {
  label: string;
  title: string;
  body: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" style={styles.sourceBtn} onPress={onPress}>
      <Text style={styles.sourceBtnIcon}>{label}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.sourceBtnTitle}>{title}</Text>
        <Text style={styles.sourceBtnSub}>{body}</Text>
      </View>
    </Pressable>
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
  backText: { color: bloom.primaryInk, ...bloom.text.small, fontWeight: '900' },
  headerTitle: { ...bloom.text.h2, color: bloom.ink },
  scroll: { padding: bloom.space.lg, paddingBottom: 60 },
  uploadHero: { padding: bloom.space.xl, marginBottom: bloom.space.xl, gap: bloom.space.md },
  heroTitle: { color: '#ffffff', ...bloom.text.h1 },
  heroSub: { color: '#d8f6eb', ...bloom.text.body, fontWeight: '700' },
  sectionLabel: {
    ...bloom.text.eyebrow,
    color: bloom.primaryInk,
    textTransform: 'uppercase',
    marginBottom: bloom.space.md,
    marginTop: bloom.space.sm,
  },
  sourceBtn: {
    backgroundColor: bloom.surface,
    borderRadius: bloom.radii.card,
    padding: bloom.space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: bloom.space.md,
    gap: bloom.space.lg,
    minHeight: 88,
    borderWidth: 1,
    borderColor: bloom.hair,
    ...bloom.elevation.sm,
  },
  sourceBtnIcon: { color: bloom.primaryInk, ...bloom.text.eyebrow, minWidth: 54, textTransform: 'uppercase' },
  sourceBtnTitle: { ...bloom.text.title, color: bloom.ink },
  sourceBtnSub: { ...bloom.text.small, color: bloom.muted, marginTop: 2 },
  previewCard: { padding: bloom.space.lg, marginBottom: bloom.space.lg },
  preview: { width: '100%', height: 220, borderRadius: bloom.radii.md, backgroundColor: bloom.hair, marginBottom: bloom.space.md },
  filePreview: { padding: bloom.space.xl, alignItems: 'center', marginBottom: bloom.space.md },
  filePreviewIcon: { fontSize: 28, lineHeight: 34, marginBottom: bloom.space.md, color: bloom.primaryInk, fontWeight: '900', letterSpacing: 0 },
  filePreviewName: { ...bloom.text.small, color: bloom.ink, textAlign: 'center', fontWeight: '700' },
  changeBtn: { alignSelf: 'center', minHeight: 44, justifyContent: 'center' },
  changeBtnText: { color: bloom.primaryInk, ...bloom.text.small, fontWeight: '900' },
  formCard: { padding: bloom.space.xl },
  inputLabel: { ...bloom.text.small, fontWeight: '800', color: bloom.muted, marginBottom: bloom.space.sm },
  required: { color: bloom.danger },
  input: {
    backgroundColor: bloom.surface,
    borderRadius: bloom.radii.md,
    borderWidth: 1,
    borderColor: '#dcebe4',
    paddingHorizontal: bloom.space.lg,
    paddingVertical: bloom.space.md,
    ...bloom.text.body,
    color: bloom.ink,
    marginBottom: bloom.space.lg,
  },
  notesInput: { minHeight: 96, textAlignVertical: 'top' },
  errorText: { color: bloom.danger, ...bloom.text.small, marginBottom: bloom.space.lg, fontWeight: '700' },
  uploadBtn: {
    backgroundColor: bloom.primary,
    borderRadius: bloom.radii.md,
    paddingVertical: bloom.space.lg,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: bloom.space.sm,
    marginTop: bloom.space.xs,
    minHeight: 54,
    ...bloom.elevation.sm,
  },
  uploadBtnDisabled: { opacity: 0.6 },
  uploadBtnText: { color: '#ffffff', ...bloom.text.title },
});
