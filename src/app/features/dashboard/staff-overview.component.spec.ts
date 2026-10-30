import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { StaffOverviewComponent } from './staff-overview.component';
import { AuthService } from '../../core/services/auth.service';

describe('Staff overview organization scope', () => {
  let fixture: ComponentFixture<StaffOverviewComponent>;
  let http: HttpTestingController;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffOverviewComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { currentUser: signal({ role_id: 'SUPERADMIN' }) } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(StaffOverviewComponent);
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/tenants')).flush([]);
  });
  afterEach(() => {
    fixture.destroy();
    http.verify();
  });
  it('keeps the selected organization when an older request completes late', () => {
    const oldAgenda = http.expectOne((r) => r.url.endsWith('/appointments'));
    const oldPatients = http.expectOne((r) => r.body?.entity === 'patients');
    const oldPayments = http.expectOne((r) => r.body?.entity === 'payments');
    fixture.componentInstance.changeTenant({ target: { value: 'clinic-b' } } as unknown as Event);
    const agenda = http.expectOne((r) => r.url.endsWith('/appointments'));
    expect(agenda.request.params.get('tenant_id')).toBe('clinic-b');
    agenda.flush([]);
    const patients = http.expectOne((r) => r.body?.entity === 'patients');
    expect(patients.request.body.tenant_id).toBe('clinic-b');
    patients.flush({ rows: [], total_rows: 7 });
    http.expectOne((r) => r.body?.entity === 'payments').flush({ rows: [], total_rows: 0 });
    oldAgenda.flush([]);
    oldPatients.flush({ rows: [], total_rows: 999 });
    oldPayments.flush({ rows: [{ customer_name: 'Other organization' }], total_rows: 1 });
    expect(fixture.componentInstance.patients()).toBe(7);
    expect(fixture.componentInstance.recentPayments()).toEqual([]);
  });
  it('counts scheduled appointments without presenting them as completed visits', () => {
    const date = new Date().toISOString();
    http
      .expectOne((r) => r.url.endsWith('/appointments'))
      .flush([
        { id: 'a', status: 'CONFIRMED', scheduled_at: date },
        { id: 'b', status: 'PENDING', scheduled_at: date },
        { id: 'c', status: 'CANCELLED', scheduled_at: date },
      ]);
    http.expectOne((r) => r.body?.entity === 'patients').flush({ rows: [], total_rows: 0 });
    http.expectOne((r) => r.body?.entity === 'payments').flush({ rows: [], total_rows: 0 });
    fixture.detectChanges();
    expect(fixture.componentInstance.chart().at(-1)?.count).toBe(2);
    expect(fixture.componentInstance.confirmed()).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Citas pendientes y confirmadas');
  });
});
