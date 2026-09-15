import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Payment,
  PaymentCreate,
  PaymentOrderCreated,
  PaymentStats,
} from '../models/payment.model';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private apiUrl = `${environment.apiUrl}/payments`;

  constructor(private http: HttpClient) {}

  createPayment(data: PaymentCreate): Observable<PaymentOrderCreated> {
    return this.http.post<PaymentOrderCreated>(`${this.apiUrl}/create`, data);
  }

  capturePayment(paypalOrderId: string): Observable<Payment> {
    return this.http.post<Payment>(`${this.apiUrl}/capture`, {
      paypal_order_id: paypalOrderId,
    });
  }

  getPayments(tenantId?: string, status?: string): Observable<Payment[]> {
    let params = new HttpParams();
    if (tenantId) params = params.set('tenant_id', tenantId);
    if (status) params = params.set('status', status);
    return this.http.get<Payment[]>(this.apiUrl, { params });
  }

  getStats(tenantId?: string): Observable<PaymentStats> {
    let params = new HttpParams();
    if (tenantId) params = params.set('tenant_id', tenantId);
    return this.http.get<PaymentStats>(`${this.apiUrl}/stats`, { params });
  }

  cancelPayment(paymentId: string): Observable<Payment> {
    return this.http.post<Payment>(`${this.apiUrl}/${paymentId}/cancel`, {});
  }
}
