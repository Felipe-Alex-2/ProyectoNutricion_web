import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PatientLink, GenerateLinkRequest, ClaimLinkRequest } from '../models/patient-link.model';

@Injectable({
  providedIn: 'root',
})
export class PatientLinkService {
  private apiUrl = `${environment.apiUrl}/patient-links`;

  constructor(private http: HttpClient) {}

  generateLink(data: GenerateLinkRequest): Observable<PatientLink> {
    return this.http.post<PatientLink>(`${this.apiUrl}/generate`, data);
  }

  getLinks(tenantId?: string): Observable<PatientLink[]> {
    const params: Record<string, string> = {};
    if (tenantId) params['tenant_id'] = tenantId;
    return this.http.get<PatientLink[]>(this.apiUrl, { params });
  }

  claimLink(data: ClaimLinkRequest): Observable<PatientLink> {
    return this.http.post<PatientLink>(`${this.apiUrl}/claim`, data);
  }
}
