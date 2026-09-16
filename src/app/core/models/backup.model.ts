export interface BackupSetting {
  id: string;
  auto_backup_enabled: boolean;
  frequency_hours: number;
  retention_days: number;
  last_backup_at?: string;
  updated_at: string;
}

export interface BackupSettingUpdate {
  auto_backup_enabled?: boolean;
  frequency_hours?: number;
  retention_days?: number;
}

export interface BackupLog {
  id: string;
  filename: string;
  file_size_bytes: number;
  checksum?: string;
  backup_type: string;
  status: string;
  details?: string;
  created_at: string;
}

export interface BackupRestoreResponse {
  success: boolean;
  message: string;
  tables_restored: number;
  records_restored: number;
}
