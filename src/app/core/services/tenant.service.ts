import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Tenant, TenantCreate, TenantUpdate } from '../models/tenant.model';

@Injectable({
  providedIn: 'root',
})
export class TenantService {
  private apiUrl = `${environment.apiUrl}/tenants`;

  constructor(private http: HttpClient) {}

  getTenants(activeOnly: boolean = false): Observable<Tenant[]> {
    return this.http.get<Tenant[]>(this.apiUrl, {
      params: { active_only: activeOnly.toString() },
    });
  }

  getTenant(id: string): Observable<Tenant> {
    return this.http.get<Tenant>(`${this.apiUrl}/${id}`);
  }

  createTenant(data: TenantCreate): Observable<Tenant> {
    return this.http.post<Tenant>(this.apiUrl, data);
  }

  updateTenant(id: string, data: TenantUpdate): Observable<Tenant> {
    return this.http.put<Tenant>(`${this.apiUrl}/${id}`, data);
  }

  toggleStatus(id: string): Observable<Tenant> {
    return this.http.patch<Tenant>(`${this.apiUrl}/${id}/toggle`, {});
  }

  deleteTenant(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
