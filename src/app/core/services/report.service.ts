import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReportEntityMeta, ReportQueryRequest, ReportQueryResponse } from '../models/report.model';

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private apiUrl = `${environment.apiUrl}/reports`;

  entities = signal<ReportEntityMeta[]>([]);
  currentReport = signal<ReportQueryResponse | null>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  getEntities(): Observable<ReportEntityMeta[]> {
    this.isLoading.set(true);
    return this.http.get<ReportEntityMeta[]>(`${this.apiUrl}/entities`).pipe(
      tap({
        next: (data) => {
          this.entities.set(data);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.detail || 'Error al obtener entidades reportables');
          this.isLoading.set(false);
        },
      })
    );
  }

  queryReport(req: ReportQueryRequest): Observable<ReportQueryResponse> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    return this.http.post<ReportQueryResponse>(`${this.apiUrl}/query`, req).pipe(
      tap({
        next: (res) => {
          this.currentReport.set(res);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.detail || 'Error al generar vista previa del reporte');
          this.isLoading.set(false);
        },
      })
    );
  }

  exportExcel(req: ReportQueryRequest): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/export/excel`, req, {
      responseType: 'blob',
    });
  }

  exportPdf(req: ReportQueryRequest): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/export/pdf`, req, {
      responseType: 'blob',
    });
  }

  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
