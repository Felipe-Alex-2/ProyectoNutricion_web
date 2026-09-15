import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Appointment, AppointmentCreate, AppointmentCancel, Nutritionist } from '../models/appointment.model';

@Injectable({
  providedIn: 'root',
})
export class AppointmentService {
  private apiUrl = `${environment.apiUrl}/appointments`;

  constructor(private http: HttpClient) {}

  getAppointments(status?: string, tenantId?: string): Observable<Appointment[]> {
    let params = new HttpParams();
    if (status && status !== 'ALL') {
      params = params.set('status', status);
    }
    if (tenantId) {
      params = params.set('tenant_id', tenantId);
    }
    return this.http.get<Appointment[]>(this.apiUrl, { params });
  }

  getNutritionists(tenantId?: string): Observable<Nutritionist[]> {
    let params = new HttpParams();
    if (tenantId) {
      params = params.set('tenant_id', tenantId);
    }
    return this.http.get<Nutritionist[]>(`${this.apiUrl}/nutritionists`, { params });
  }

  scheduleAppointment(data: AppointmentCreate): Observable<Appointment> {
    return this.http.post<Appointment>(this.apiUrl, data);
  }

  confirmAppointment(id: string): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.apiUrl}/${id}/confirm`, {});
  }

  cancelAppointment(id: string, reason?: string): Observable<Appointment> {
    const body: AppointmentCancel = { cancellation_reason: reason || undefined };
    return this.http.post<Appointment>(`${this.apiUrl}/${id}/cancel`, body);
  }
}
