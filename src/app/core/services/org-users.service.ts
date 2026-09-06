import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, OrganizationUserCreate, UserUpdate } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class OrgUsersService {
  private apiUrl = `${environment.apiUrl}/organization-users`;

  constructor(private http: HttpClient) {}

  getUsers(tenantId?: string, roleId?: string, q?: string): Observable<User[]> {
    const params: Record<string, string> = {};
    if (tenantId) params['tenant_id'] = tenantId;
    if (roleId) params['role_id'] = roleId;
    if (q) params['q'] = q;
    return this.http.get<User[]>(this.apiUrl, { params });
  }

  createUser(data: OrganizationUserCreate): Observable<User> {
    return this.http.post<User>(this.apiUrl, data);
  }

  updateUser(id: string, data: UserUpdate): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, data);
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  toggleUserStatus(id: string): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${id}/toggle-status`, {});
  }
}
