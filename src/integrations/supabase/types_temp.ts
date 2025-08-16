// Tipos temporários para corrigir os erros de lint
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface ProcessingQueueRow {
  id: string;
  prestacao_id: string;
  user_id: string;
  status: ProcessingStatus;
  priority: TaskPriority;
  file_name: string;
  file_size: number;
  file_url: string;
  storage_provider: string;
  progress_percentage: number;
  current_stage: string;
  stage_message: string | null;
  extracted_data: any;
  retry_count: number;
  max_retries: number;
  error_message: string | null;
  error_details: any;
  processing_logs: any;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

export interface ProcessingHistoryRow {
  id: string;
  queue_id: string;
  previous_status: ProcessingStatus | null;
  new_status: ProcessingStatus;
  stage: string | null;
  message: string | null;
  details: any;
  created_at: string;
}
