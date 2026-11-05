import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PatientAnamnesis, ClinicalRecord, ClinicalRecordCreate } from '../models/clinical.model';

@Injectable({
  providedIn: 'root',
})
export class ClinicalService {
  private apiUrl = `${environment.apiUrl}/clinical`;

  foodRecords = signal<any[]>([]);
  foodLoading = signal(false);
  foodError = signal<string | null>(null);
  private foodRequest = 0;
  loadFoodHistory(patientId: string): void {
    const request = ++this.foodRequest;
    this.foodRecords.set([]);
    this.foodError.set(null);
    this.foodLoading.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/food/history`, {params: {patient_id: patientId}}).subscribe({
      next: rows => { if (request === this.foodRequest) { this.foodRecords.set(rows); this.foodLoading.set(false); } },
      error: err => { if (request === this.foodRequest) { this.foodError.set(err?.error?.detail || 'No se pudo cargar la alimentación.'); this.foodLoading.set(false); } }
    });
  }

  currentAnamnesis = signal<PatientAnamnesis | null>(null);
  clinicalRecords = signal<ClinicalRecord[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  getPatientAnamnesis(patientId: string): Observable<PatientAnamnesis | null> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    return this.http.get<PatientAnamnesis | null>(`${this.apiUrl}/patients/${patientId}/anamnesis`).pipe(
      tap({
        next: (data) => {
          this.currentAnamnesis.set(data);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.detail || 'Error al cargar anamnesis');
          this.isLoading.set(false);
        },
      })
    );
  }

  getPatientClinicalRecords(patientId: string): Observable<ClinicalRecord[]> {
    this.isLoading.set(true);
    return this.http.get<ClinicalRecord[]>(`${this.apiUrl}/patients/${patientId}/records`).pipe(
      tap({
        next: (data) => {
          this.clinicalRecords.set(data);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.detail || 'Error al cargar historial clínico');
          this.isLoading.set(false);
        },
      })
    );
  }

  addClinicalRecord(patientId: string, data: ClinicalRecordCreate): Observable<ClinicalRecord> {
    this.isLoading.set(true);
    return this.http.post<ClinicalRecord>(`${this.apiUrl}/patients/${patientId}/records`, data).pipe(
      tap({
        next: (record) => {
          this.clinicalRecords.update((curr) => [record, ...curr]);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.detail || 'Error al guardar registro clínico');
          this.isLoading.set(false);
        },
      })
    );
  }

  getAiRecommendations(patientId: string): Observable<any> {
    this.isLoading.set(true);
    return this.http.get<any>(`${this.apiUrl}/patients/${patientId}/ai-recommendations`).pipe(
      tap({
        next: () => this.isLoading.set(false),
        error: (err) => {
          this.errorMessage.set(err?.error?.detail || 'Error al obtener recomendaciones de IA');
          this.isLoading.set(false);
        }
      })
    );
  }
}
