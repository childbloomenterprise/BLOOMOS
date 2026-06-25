export type FileType = 'image' | 'pdf' | 'document';

export interface HealthRecord {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  file_path: string;
  file_type: FileType;
  file_name: string;
  file_size: number | null;
  recorded_at: string | null;
  created_at: string;
}
