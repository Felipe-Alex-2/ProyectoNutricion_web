import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ActivityLog, ActivityLogCreate } from '../models/activity-log.model';

@Injectable({
  providedIn: 'root',
})
export class ActivityLogService {
  private apiUrl = `${environment.apiUrl}/activity-logs`;
  private localKey = 'nutrisalud_activity_logs';

  logs = signal<ActivityLog[]>([]);
  isLoading = signal<boolean>(false);

  constructor(private http: HttpClient) {
    this.clearLocalLogs();
  }

  private loadLocalLogs(): void {
    try {
      const raw = sessionStorage.getItem(this.localKey) || localStorage.getItem(this.localKey);
      if (raw) {
        this.logs.set(JSON.parse(raw));
      }
    } catch (_) {}
  }

  private saveLocalLogs(logs: ActivityLog[]): void {
    try {
      sessionStorage.setItem(this.localKey, JSON.stringify(logs.slice(0, 100)));
    } catch (_) {}
  }

  fetchLogs(category?: string): Observable<ActivityLog[]> {
    this.isLoading.set(true);
    const params: Record<string, string> = {};
    if (category) params['category'] = category;

    return this.http.get<ActivityLog[]>(this.apiUrl, { params }).pipe(
      tap((remoteLogs) => {
        this.logs.set(remoteLogs);
        this.saveLocalLogs(remoteLogs);
        this.isLoading.set(false);
      }),
      catchError((err) => {
        console.warn('Bitácora remota no disponible, usando caché local', err);
        this.isLoading.set(false);
        return of(this.logs());
      })
    );
  }

  recordActivity(action: string, description: string, category: string = 'SISTEMA'): void {
    // Business mutations are recorded by the authenticated server transaction.
    // Navigation and browser-local events never become audit records.
  }

  clearLocalLogs(): void {
    this.logs.set([]);
    sessionStorage.removeItem(this.localKey);
    localStorage.removeItem(this.localKey);
  }
}
