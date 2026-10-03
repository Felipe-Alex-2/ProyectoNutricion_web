import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NutritionalPlanModel } from '../models/clinical.model';

@Injectable({
  providedIn: 'root',
})
export class AIPlanService {
  private apiUrl = environment.apiUrl;

  patientPlans = signal<NutritionalPlanModel[]>([]);
  activeDraftPlan = signal<NutritionalPlanModel | null>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  generateDraft(
    patientId: string,
    customGoal?: string,
    calorieAdjustmentPct?: number,
    mealsPerDay: number = 4
  ): Observable<NutritionalPlanModel> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload = {
      patient_id: patientId,
      custom_goal: customGoal,
      calorie_adjustment_pct: calorieAdjustmentPct,
      meals_per_day: mealsPerDay,
    };

    return this.http.post<NutritionalPlanModel>(`${this.apiUrl}/plans/generate-draft`, payload).pipe(
      tap({
        next: (plan) => {
          this.activeDraftPlan.set(plan);
          this.patientPlans.update((curr) => [plan, ...curr.filter((p) => p.id !== plan.id)]);
          this.isLoading.set(false);
          this.successMessage.set('¡Borrador generado con éxito con el cálculo Mifflin-St Jeor y reglas de seguridad!');
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.detail || 'Error al generar el borrador');
          this.isLoading.set(false);
        },
      })
    );
  }

  getPatientPlans(patientId: string): Observable<NutritionalPlanModel[]> {
    this.isLoading.set(true);
    return this.http.get<NutritionalPlanModel[]>(`${this.apiUrl}/plans/patient/${patientId}`).pipe(
      tap({
        next: (plans) => {
          this.patientPlans.set(plans);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.detail || 'Error al consultar planes');
          this.isLoading.set(false);
        },
      })
    );
  }

  approvePlan(planId: string): Observable<NutritionalPlanModel> {
    this.isLoading.set(true);
    return this.http.post<NutritionalPlanModel>(`${this.apiUrl}/plans/${planId}/approve`, {}).pipe(
      tap({
        next: (plan) => {
          this.patientPlans.update((curr) =>
            curr.map((p) => (p.id === plan.id ? plan : p.status === 'APPROVED' ? { ...p, status: 'ARCHIVED' } : p))
          );
          this.activeDraftPlan.set(plan);
          this.isLoading.set(false);
          this.successMessage.set('¡Plan aprobado y publicado exitosamente para el paciente!');
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.detail || 'Error al aprobar plan');
          this.isLoading.set(false);
        },
      })
    );
  }

  triggerCheckAppointments(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/automation/check-appointments`, {});
  }

  triggerWeeklyHabits(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/automation/weekly-habits`, {});
  }

  triggerNutritionistSummary(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/automation/nutritionist-summary`, {});
  }
}
