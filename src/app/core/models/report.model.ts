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
}

export interface ReportQueryResponse {
  entity: string;
  title: string;
  generated_at: string;
  columns: ReportColumnMeta[];
  rows: Record<string, any>[];
  total_rows: number;
}
