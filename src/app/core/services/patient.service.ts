import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PatientListItem, User, UserUpdate } from '../models/user.model';
import { MessageResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class PatientService {
  private apiUrl = `${environment.apiUrl}/users`;

  patients = signal<PatientListItem[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  getPatients(search?: string, isActive?: boolean): Observable<PatientListItem[]> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    let params = new HttpParams();
    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }
    if (isActive !== undefined && isActive !== null) {
      params = params.set('is_active', String(isActive));
    }

    return this.http.get<PatientListItem[]>(`${this.apiUrl}/patients`, { params }).pipe(
      tap({
        next: (data) => {
          this.patients.set(data);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.detail || 'Error al cargar clientes');
          this.isLoading.set(false);
        },
      })
    );
  }

  updatePatient(patientId: string, data: UserUpdate): Observable<User> {
    this.isLoading.set(true);
    return this.http.put<User>(`${this.apiUrl}/patients/${patientId}`, data).pipe(
      tap({
        next: (updated) => {
          this.patients.update((curr) =>
            curr.map((p) =>
              p.id === patientId
                ? {
                    ...p,
                    full_name: updated.full_name,
                    email: updated.email,
                    phone: updated.phone,
                    is_active: updated.is_active,
                  }
                : p
            )
          );
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.detail || 'Error al actualizar datos del cliente');
          this.isLoading.set(false);
        },
      })
    );
  }

  deletePatient(patientId: string): Observable<MessageResponse> {
    this.isLoading.set(true);
    return this.http.delete<MessageResponse>(`${this.apiUrl}/patients/${patientId}`).pipe(
      tap({
        next: () => {
          this.patients.update((curr) =>
            curr.map((p) => (p.id === patientId ? { ...p, is_active: false, linked_status: 'UNLINKED' } : p))
          );
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.detail || 'Error al desactivar el cliente');
          this.isLoading.set(false);
        },
      })
    );
  }
}
