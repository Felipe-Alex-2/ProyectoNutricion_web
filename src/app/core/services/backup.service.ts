import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BackupSetting, BackupSettingUpdate, BackupLog, BackupRestoreResponse } from '../models/backup.model';

@Injectable({
  providedIn: 'root',
})
export class BackupService {
  private apiUrl = `${environment.apiUrl}/backup`;

  settings = signal<BackupSetting | null>(null);
  history = signal<BackupLog[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  getSettings(): Observable<BackupSetting> {
    return this.http.get<BackupSetting>(`${this.apiUrl}/settings`).pipe(
      tap({
        next: (s) => this.settings.set(s),
        error: (err) => this.errorMessage.set(err?.error?.detail || 'Error al cargar ajustes de backup'),
      })
    );
  }

  updateSettings(data: BackupSettingUpdate): Observable<BackupSetting> {
    this.isLoading.set(true);
    return this.http.put<BackupSetting>(`${this.apiUrl}/settings`, data).pipe(
      tap({
        next: (s) => {
          this.settings.set(s);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.detail || 'Error al actualizar ajustes');
          this.isLoading.set(false);
        },
      })
    );
  }

  exportManual(): Observable<BackupLog> {
    this.isLoading.set(true);
    return this.http.post<BackupLog>(`${this.apiUrl}/export`, {}).pipe(
      tap({
        next: (log) => {
          this.history.update((curr) => [log, ...curr]);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.detail || 'Error al generar copia de seguridad');
          this.isLoading.set(false);
        },
      })
    );
  }

  getHistory(): Observable<BackupLog[]> {
    this.isLoading.set(true);
    return this.http.get<BackupLog[]>(`${this.apiUrl}/history`).pipe(
      tap({
        next: (logs) => {
          this.history.set(logs);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.detail || 'Error al obtener historial de backups');
          this.isLoading.set(false);
        },
      })
    );
  }

  downloadBackup(filename: string): void {
    const downloadUrl = `${this.apiUrl}/download/${encodeURIComponent(filename)}`;
    window.open(downloadUrl, '_blank');
  }

  restoreBackup(file: File): Observable<BackupRestoreResponse> {
    this.isLoading.set(true);
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<BackupRestoreResponse>(`${this.apiUrl}/restore`, formData).pipe(
      tap({
        next: () => this.isLoading.set(false),
        error: (err) => {
          this.errorMessage.set(err?.error?.detail || 'Error al restaurar copia de seguridad');
          this.isLoading.set(false);
        },
      })
    );
  }
}
