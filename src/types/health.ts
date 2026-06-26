export type FileType = 'image' | 'pdf' | 'document';

export type AiStatus = 'pending' | 'done' | 'error';

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
  // Persisted AI explanation (written back by the explain-report Edge Function).
  ai_summary: string | null;
  ai_questions: string[] | null;
  ai_status: AiStatus | null;
}
