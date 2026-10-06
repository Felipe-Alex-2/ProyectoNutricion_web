import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BackupSetting, BackupSettingUpdate, BackupLog, BackupRestoreResponse } from '../models/backup.model';
import { TokenService } from './token.service';

@Injectable({
  providedIn: 'root',
})
export class BackupService {
  private apiUrl = `${environment.apiUrl}/backup`;

  settings = signal<BackupSetting | null>(null);
  history = signal<BackupLog[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  constructor(
    private http: HttpClient,
    private tokenService: TokenService,
  ) {}

  getSettings(tenantId?: string): Observable<BackupSetting> {
    const params: Record<string, string> = {};
    if (tenantId) params['tenant_id'] = tenantId;
    return this.http.get<BackupSetting>(`${this.apiUrl}/settings`, { params }).pipe(
      tap({
        next: (s) => this.settings.set(s),
        error: (err) => this.errorMessage.set(err?.error?.detail || 'Error al cargar ajustes de backup'),
      })
    );
  }

  updateSettings(data: BackupSettingUpdate, tenantId?: string): Observable<BackupSetting> {
    this.isLoading.set(true);
    const params: Record<string, string> = {};
    if (tenantId) params['tenant_id'] = tenantId;
    return this.http.put<BackupSetting>(`${this.apiUrl}/settings`, data, { params }).pipe(
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

  exportManual(tenantId?: string): Observable<BackupLog> {
    this.isLoading.set(true);
    const params: Record<string, string> = {};
    if (tenantId) params['tenant_id'] = tenantId;
    return this.http.post<BackupLog>(`${this.apiUrl}/export`, {}, { params }).pipe(
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

  getHistory(tenantId?: string): Observable<BackupLog[]> {
    this.isLoading.set(true);
    const params: Record<string, string> = {};
    if (tenantId) params['tenant_id'] = tenantId;
    return this.http.get<BackupLog[]>(`${this.apiUrl}/history`, { params }).pipe(
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
    this.isLoading.set(true);
    const token = this.tokenService.getAccessToken();
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    const downloadUrl = `${this.apiUrl}/download/${encodeURIComponent(filename)}${query}`;

    this.http.get(downloadUrl, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.isLoading.set(false);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Error al descargar la copia de seguridad.');
      },
    });
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
