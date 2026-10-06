import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Notification, NotificationCount } from '../models/notification.model';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  getMyNotifications(limit: number = 50, tenantId?: string): Observable<Notification[]> {
    let params = new HttpParams().set('limit', limit.toString());
    if (tenantId) {
      params = params.set('tenant_id', tenantId);
    }
    return this.http.get<Notification[]>(this.apiUrl, { params });
  }

  getUnreadCount(): Observable<NotificationCount> {
    return this.http.get<NotificationCount>(`${this.apiUrl}/unread-count`);
  }

  markAsRead(id: string): Observable<Notification> {
    return this.http.patch<Notification>(`${this.apiUrl}/${id}/read`, {});
  }

  markAllAsRead(): Observable<{ message: string; updated_count: number }> {
    return this.http.patch<{ message: string; updated_count: number }>(`${this.apiUrl}/read-all`, {});
  }

  sendNotification(payload: {
    user_id: string;
    title: string;
    message: string;
    type?: string;
    reference_id?: string;
  }): Observable<Notification> {
    return this.http.post<Notification>(`${this.apiUrl}/send`, payload);
  }

  broadcastTenantNotification(payload: {
    title: string;
    message: string;
    type?: string;
    patient_ids?: string[];
    reference_id?: string;
  }): Observable<{ sent_count: number; message: string }> {
    return this.http.post<{ sent_count: number; message: string }>(`${this.apiUrl}/broadcast-tenant`, payload);
  }
}
