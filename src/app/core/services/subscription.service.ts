import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  SubscriptionPlan,
  Subscription,
  CreateOrderResponse,
  SubscriptionHistory,
} from '../models/subscription.model';

@Injectable({
  providedIn: 'root',
})
export class SubscriptionService {
  private apiUrl = `${environment.apiUrl}/subscriptions`;

  constructor(private http: HttpClient) {}

  getPlans(): Observable<SubscriptionPlan[]> {
    return this.http.get<SubscriptionPlan[]>(`${this.apiUrl}/plans`);
  }

  getCurrentSubscription(): Observable<Subscription | null> {
    return this.http.get<Subscription | null>(`${this.apiUrl}/current`);
  }

  createOrder(planName: string): Observable<CreateOrderResponse> {
    return this.http.post<CreateOrderResponse>(`${this.apiUrl}/create-order`, {
      plan_name: planName,
    });
  }

  captureOrder(orderId: string): Observable<Subscription> {
    return this.http.post<Subscription>(`${this.apiUrl}/capture`, {
      order_id: orderId,
    });
  }

  cancelSubscription(): Observable<Subscription> {
    return this.http.post<Subscription>(`${this.apiUrl}/cancel`, {});
  }

  getHistory(): Observable<SubscriptionHistory[]> {
    return this.http.get<SubscriptionHistory[]>(`${this.apiUrl}/history`);
  }
}
