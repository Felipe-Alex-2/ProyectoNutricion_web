export interface ReportColumnMeta {
  key: string;
  label: string;
  type?: string;
}

export interface ReportEntityMeta {
  entity: string;
  label: string;
  description: string;
  available_columns: ReportColumnMeta[];
}

export interface ReportQueryRequest {
  entity: string;
  columns?: string[];
  start_date?: string;
  end_date?: string;
  status?: string;
  search?: string;
  sort_by?: string;
  sort_order?: string;
  limit?: number;
  tenant_id?: string;
}

export interface ReportQueryResponse {
  entity: string;
  title: string;
  generated_at: string;
  columns: ReportColumnMeta[];
  rows: Record<string, any>[];
  total_rows: number;
}

export interface VoiceReportCommandRequest {
  transcript: string;
  tenant_id?: string;
}

export interface VoiceReportCommandResponse {
  parsed_request: ReportQueryRequest;
  explanation: string;
  report_data?: ReportQueryResponse;
}

export interface VoiceReportSummaryRequest {
  entity: string;
  title: string;
  total_rows: number;
  columns: string[];
  sample_rows: Record<string, any>[];
}

export interface VoiceReportSummaryResponse {
  summary_text: string;
  bullet_points: string[];
}

export interface VoiceQueryGuideItem {
  id: string;
  category: 'patients' | 'recipes' | 'appointments' | 'payments' | 'clinical_records' | 'activity_logs';
  categoryLabel: string;
  categoryIcon: string;
  title: string;
  command: string;
  description: string;
  entity: string;
  suggestedColumns: string[];
  filterBadge?: string;
}

