import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Role, Permission } from '../models/rbac.model';

@Injectable({
  providedIn: 'root',
})
export class RBACService {
  private apiUrl = `${environment.apiUrl}/roles`;

  constructor(private http: HttpClient) {}

  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(this.apiUrl);
  }

  getPermissions(): Observable<Permission[]> {
    return this.http.get<Permission[]>(`${this.apiUrl}/permissions`);
  }

  updateRolePermissions(roleId: string, permissionIds: string[]): Observable<Role> {
    return this.http.put<Role>(`${this.apiUrl}/${roleId}/permissions`, {
      permission_ids: permissionIds,
    });
  }
}
