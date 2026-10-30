import { Component, DestroyRef, OnInit, computed, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IconComponent } from '../../shared/ui/icon.component';
import { AuthService } from '../../core/services/auth.service';
import { AppointmentService } from '../../core/services/appointment.service';
import { Appointment } from '../../core/models/appointment.model';
import { TenantService } from '../../core/services/tenant.service';
import { Tenant } from '../../core/models/tenant.model';
import { ReportQueryResponse } from '../../core/models/report.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-staff-overview',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './staff-overview.component.html',
  styleUrl: './staff-overview.component.css',
})
export class StaffOverviewComponent implements OnInit {
  readonly navigate = output<{ tab: string; tenantId: string }>();
  readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly appointmentsApi = inject(AppointmentService);
  private readonly tenantApi = inject(TenantService);
  private readonly destroyRef = inject(DestroyRef);
  readonly tenants = signal<Tenant[]>([]);
  readonly selectedTenant = signal('');
  readonly period = signal(6);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly data = signal<Appointment[]>([]);
  readonly patients = signal<number | null>(null);
  readonly recentPayments = signal<Record<string, unknown>[]>([]);
  readonly paymentsLoaded = signal(false);
  private generation = 0;
  readonly isSaas = computed(() => this.auth.currentUser()?.role_id === 'SUPERADMIN');
  readonly confirmed = computed(() => this.data().filter((a) => a.status === 'CONFIRMED').length);
  readonly pending = computed(() => this.data().filter((a) => a.status === 'PENDING').length);
  readonly upcoming = computed(() =>
    this.data()
      .filter((a) => a.status !== 'CANCELLED' && new Date(a.scheduled_at).getTime() >= Date.now())
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
      .slice(0, 4),
  );
  readonly chart = computed(() => {
    const now = new Date();
    const months = Array.from({ length: this.period() }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - this.period() + i + 1, 1);
      const count = this.data().filter((a) => {
        const d = new Date(a.scheduled_at);
        return (
          a.status !== 'CANCELLED' &&
          d.getFullYear() === date.getFullYear() &&
          d.getMonth() === date.getMonth()
        );
      }).length;
      return {
        label: date.toLocaleDateString('es', { month: 'short' }).replace('.', ''),
        count,
        full: date.toLocaleDateString('es', { month: 'long', year: 'numeric' }),
      };
    });
    const max = Math.max(1, ...months.map((m) => m.count));
    return months.map((m) => ({ ...m, height: m.count ? Math.max(5, (m.count / max) * 100) : 0 }));
  });
  ngOnInit(): void {
    this.selectedTenant.set(this.auth.currentUser()?.tenant_id || '');
    this.tenantApi
      .getTenants()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (t) => this.tenants.set(t), error: () => {} });
    this.refresh();
  }
  refresh(): void {
    const generation = ++this.generation;
    this.loading.set(true);
    this.error.set('');
    this.patients.set(null);
    this.paymentsLoaded.set(false);
    this.data.set([]);
    this.recentPayments.set([]);
    const tenant = this.selectedTenant() || undefined;
    this.appointmentsApi
      .getAppointments('ALL', tenant)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          if (generation === this.generation) {
            this.data.set(rows);
            this.loading.set(false);
          }
        },
        error: () => {
          if (generation === this.generation) {
            this.loading.set(false);
            this.error.set('No pudimos cargar la agenda. Intenta actualizar el resumen.');
          }
        },
      });
    // Report endpoints enforce the user's organization and nutritionist scope server-side.
    this.http
      .post<ReportQueryResponse>(`${environment.apiUrl}/reports/query`, {
        entity: 'patients',
        columns: ['is_active'],
        status: 'active',
        limit: 5000,
        tenant_id: tenant,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          if (generation === this.generation) this.patients.set(r.total_rows);
        },
        error: () => {},
      });
    this.http
      .post<ReportQueryResponse>(`${environment.apiUrl}/reports/query`, {
        entity: 'payments',
        columns: ['customer_name', 'concept', 'amount', 'currency', 'status', 'created_at'],
        limit: 5,
        tenant_id: tenant,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          if (generation === this.generation) {
            this.recentPayments.set(r.rows);
            this.paymentsLoaded.set(true);
          }
        },
        error: () => {},
      });
  }
  changeTenant(event: Event): void {
    this.selectedTenant.set((event.target as HTMLSelectElement).value);
    this.refresh();
  }
  open(tab: string): void {
    this.navigate.emit({ tab, tenantId: this.selectedTenant() });
  }

  statusLabel(status: unknown): string {
    return (
      (
        {
          COMPLETED: 'Completado',
          PENDING: 'Pendiente',
          CANCELLED: 'Cancelado',
          FAILED: 'Fallido',
        } as Record<string, string>
      )[String(status)] || String(status)
    );
  }
}
