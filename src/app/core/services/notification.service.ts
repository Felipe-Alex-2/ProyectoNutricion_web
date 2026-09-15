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

  getMyNotifications(limit: number = 50): Observable<Notification[]> {
    const params = new HttpParams().set('limit', limit.toString());
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
}
