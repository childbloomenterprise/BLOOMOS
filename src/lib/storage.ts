import { supabase } from './supabase';

const BUCKET = 'health-docs';

export async function uploadHealthFile(
  userId: string,
  fileUri: string,
  fileName: string,
  mimeType: string,
): Promise<string> {
  const ext = fileName.split('.').pop() ?? 'bin';
  const storagePath = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const response = await fetch(fileUri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, blob, { contentType: mimeType, upsert: false });

  if (error) throw error;
  return storagePath;
}

export async function getSignedUrl(filePath: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

export async function deleteHealthFile(filePath: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([filePath]);
  if (error) throw error;
}
