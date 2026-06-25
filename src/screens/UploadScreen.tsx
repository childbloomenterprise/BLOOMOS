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
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Add Health Record</Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {!picked ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Choose file source</Text>

            {Platform.OS !== 'web' && (
              <Pressable style={styles.sourceBtn} onPress={pickFromCamera}>
                <Text style={styles.sourceBtnIcon}>📷</Text>
                <View>
                  <Text style={styles.sourceBtnTitle}>Take Photo</Text>
                  <Text style={styles.sourceBtnSub}>Open camera to photograph a document</Text>
                </View>
              </Pressable>
            )}

            <Pressable style={styles.sourceBtn} onPress={pickFromGallery}>
              <Text style={styles.sourceBtnIcon}>🖼️</Text>
              <View>
                <Text style={styles.sourceBtnTitle}>Choose from Gallery</Text>
                <Text style={styles.sourceBtnSub}>Pick a photo already on your device</Text>
              </View>
            </Pressable>

            <Pressable style={styles.sourceBtn} onPress={pickDocument}>
              <Text style={styles.sourceBtnIcon}>📄</Text>
              <View>
                <Text style={styles.sourceBtnTitle}>Upload Document</Text>
                <Text style={styles.sourceBtnSub}>PDF, Word, or text file</Text>
              </View>
            </Pressable>
          </View>
        ) : (
          <View style={styles.section}>
            {picked.type === 'image' ? (
              <Image source={{ uri: picked.uri }} style={styles.preview} resizeMode="cover" />
            ) : (
              <View style={styles.filePreview}>
                <Text style={styles.filePreviewIcon}>
                  {picked.type === 'pdf' ? '📄' : '📋'}
                </Text>
                <Text style={styles.filePreviewName} numberOfLines={2}>
                  {picked.name}
                </Text>
              </View>
            )}
            <Pressable style={styles.changeBtn} onPress={() => setPicked(null)}>
              <Text style={styles.changeBtnText}>Change file</Text>
            </Pressable>
          </View>
        )}

        {picked && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Record details</Text>

            <Text style={styles.inputLabel}>
              Title <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Blood test results, March 2025"
              placeholderTextColor="#9AA0A6"
              value={title}
              onChangeText={setTitle}
              editable={!uploading}
              returnKeyType="next"
            />

            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Any context about this record…"
              placeholderTextColor="#9AA0A6"
              multiline
              value={notes}
              onChangeText={setNotes}
              editable={!uploading}
            />

            <Text style={styles.inputLabel}>Date recorded</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD  e.g. 2025-03-15"
              placeholderTextColor="#9AA0A6"
              value={recordedAt}
              onChangeText={setRecordedAt}
              editable={!uploading}
              keyboardType="numbers-and-punctuation"
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Pressable
              style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.uploadBtnText}>Uploading…</Text>
                </>
              ) : (
                <Text style={styles.uploadBtnText}>Save Record</Text>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FB' },
  header: {
    backgroundColor: '#FFFFFF',
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
  backText: { color: '#1F6F54', fontSize: 15, fontWeight: '500' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#111827' },
  scroll: { padding: 16, paddingBottom: 60 },
  section: { marginBottom: 8 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
    marginTop: 8,
  },
  sourceBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 14,
    shadowColor: '#1A2B4A',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  sourceBtnIcon: { fontSize: 26 },
  sourceBtnTitle: { fontSize: 15, color: '#111827', fontWeight: '600' },
  sourceBtnSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    marginBottom: 10,
  },
  filePreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    marginBottom: 10,
  },
  filePreviewIcon: { fontSize: 44, marginBottom: 10 },
  filePreviewName: { fontSize: 14, color: '#374151', textAlign: 'center' },
  changeBtn: { alignSelf: 'center', marginBottom: 20 },
  changeBtnText: { color: '#1F6F54', fontSize: 14, fontWeight: '500' },
  inputLabel: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  required: { color: '#EF4444' },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
    marginBottom: 14,
    shadowColor: '#1A2B4A',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  notesInput: { minHeight: 90, textAlignVertical: 'top' },
  errorText: { color: '#B91C1C', fontSize: 14, marginBottom: 14, lineHeight: 20 },
  uploadBtn: {
    backgroundColor: '#1F6F54',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  uploadBtnDisabled: { opacity: 0.6 },
  uploadBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
