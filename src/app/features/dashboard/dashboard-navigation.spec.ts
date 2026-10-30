import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { of, Subject } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../core/services/auth.service';
import { ReportService } from '../../core/services/report.service';
import { ThemeService } from '../../core/services/theme.service';
import { canOpenStaffTab, staffPackagesForRole } from './staff-navigation.model';

describe('Exclusive staff navigation', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let http: HttpTestingController;
  const user = signal({
    id: 'admin',
    full_name: 'Ana Prueba',
    email: 'ana@example.test',
    role_id: 'SUPERADMIN',
    tenant_id: 'clinic',
  });
  let profileSaved: Subject<unknown>;
  function flushRequests() {
    for (let pass = 0; pass < 5; pass++) {
      const requests = http.match(() => true);
      if (!requests.length) break;
      for (const request of requests) {
        const url = request.request.url;
        let body: object | null = [];
        if (url.endsWith('/unread-count')) body = { unread_count: 0 };
        if (url.endsWith('/subscriptions/current')) body = null;
        if (url.endsWith('/reports/query')) body = { rows: [], columns: [], total_rows: 0 };
        if (url.endsWith('/payments/stats'))
          body = { total_collected: 0, total_count: 0, completed_count: 0, pending_count: 0 };
        if (url.endsWith('/backup/settings'))
          body = { auto_backup_enabled: false, frequency_hours: 24 };
        if (url.endsWith('/activity-logs') && request.request.method === 'POST')
          body = {
            id: 'log',
            ...(request.request.body as object),
            created_at: new Date().toISOString(),
          };
        request.flush(body);
      }
    }
  }
  beforeEach(async () => {
    user.update((u) => ({ ...u, role_id: 'SUPERADMIN' }));
    profileSaved = new Subject();
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([{ path: 'dashboard', component: DashboardComponent }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            currentUser: user,
            isAuthenticated: signal(true),
            loadCurrentUser: () => of(user()),
            updateProfile: () => profileSaved,
          },
        },
        { provide: ThemeService, useValue: { isDarkMode: signal(false), toggleTheme: vi.fn() } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    flushRequests();
    fixture.detectChanges();
  });
  afterEach(() => {
    flushRequests();
    fixture.destroy();
    flushRequests();
    http.verify();
  });
  it('renders Dashboard directly and the four authorized packages without repeating notifications', () => {
    const labels = Array.from(fixture.nativeElement.querySelectorAll('.package-trigger')).map(
      (e: any) => e.textContent.trim(),
    );
    expect(labels).toEqual([
      'Pacientes',
      'Atención nutricional',
      'Administración',
      'Seguridad y auditoría',
    ]);
    const dashboard = fixture.nativeElement.querySelector('.dashboard-link');
    expect(dashboard.textContent.trim()).toBe('Dashboard');
    expect(dashboard.hasAttribute('aria-expanded')).toBe(false);
    expect(dashboard.getAttribute('aria-current')).toBe('page');
    const packages = staffPackagesForRole('SUPERADMIN');
    expect(
      packages.find((p) => p.id === 'administracion')?.items.some((i) => i.tab === 'suscripcion'),
    ).toBe(true);
    expect(
      packages.find((p) => p.id === 'seguridad')?.items.some((i) => i.tab === 'reportes'),
    ).toBe(true);
    expect(fixture.nativeElement.querySelector('app-staff-navigation').textContent).not.toContain(
      'Notificaciones',
    );
  });
  it('shows profile as a single page and removes it on every other module', () => {
    const component = fixture.componentInstance;
    const tabs = staffPackagesForRole('SUPERADMIN').flatMap((p) => p.items.map((i) => i.tab));
    for (const tab of ['principal', ...tabs, 'notificaciones']) {
      component.setActiveTab('perfil', false);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.edit-profile-card')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('app-staff-overview')).toBeNull();
      component.setActiveTab(tab, false);
      flushRequests();
      fixture.detectChanges();
      flushRequests();
      expect(component.isEditing()).toBe(false);
      expect(fixture.nativeElement.querySelector('.edit-profile-card')).toBeNull();
      expect(component.activeTab()).toBe(tab);
    }
  });
  it('closes all recipe, AI, payment and patient dialogs when changing a section', () => {
    const component = fixture.componentInstance;
    const flags = [
      component.recipeModalOpen,
      component.aiPlanModalOpen,
      component.aiModalOpen,
      component.paymentDetailModalOpen,
      component.patientEditModalOpen,
      component.patientDeleteModalOpen,
      component.tenantModalOpen,
      component.rolePermModalOpen,
      component.userModalOpen,
      component.tenantUsersModalOpen,
      component.restoreModalOpen,
      component.showSendTenantNotificationModal,
      component.showVoiceQueriesGuideModal,
    ];
    for (const flag of flags) flag.set(true);
    component.setActiveTab('citas', false);
    flushRequests();
    for (const flag of flags) expect(flag()).toBe(false);
  });
  it('does not navigate back or display profile feedback when a late save completes elsewhere', () => {
    const component = fixture.componentInstance;
    component.setActiveTab('perfil', false);
    component.onSaveProfile();
    component.setActiveTab('suscripcion', false);
    flushRequests();
    profileSaved.next(user());
    flushRequests();
    expect(component.activeTab()).toBe('suscripcion');
    expect(component.updateSuccess()).toBeNull();
  });
  it('keeps profile and payments exclusive when navigating through the URL', async () => {
    const router = TestBed.inject(Router);
    fixture.componentInstance.toggleEdit();
    await fixture.whenStable();
    flushRequests();
    expect(router.url).toContain('tab=perfil');
    fixture.componentInstance.setActiveTab('suscripcion');
    await fixture.whenStable();
    flushRequests();
    expect(router.url).toContain('tab=suscripcion');
    await router.navigateByUrl('/dashboard?tab=perfil');
    flushRequests();
    fixture.detectChanges();
    expect(fixture.componentInstance.activeTab()).toBe('perfil');
    expect(fixture.nativeElement.querySelector('.edit-profile-card')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.pos-layout')).toBeNull();
  });
  it('keeps unauthorized packages and unknown sections out of staff navigation', () => {
    expect(staffPackagesForRole('CLIENTE')).toEqual([]);
    expect(canOpenStaffTab('NUTRICIONISTA', 'sprint1-roles')).toBe(false);
    expect(canOpenStaffTab('ADMIN_ORGANIZATION', 'sprint1-tenants')).toBe(false);
    expect(canOpenStaffTab('NUTRICIONISTA', 'backup')).toBe(false);
    fixture.componentInstance.setActiveTab('unknown-view', false);
    flushRequests();
    expect(fixture.componentInstance.activeTab()).toBe('principal');
  });
  it('preserves the interpreted analysis for preview, save and both exports', () => {
    const component = fixture.componentInstance;
    component.setActiveTab('reportes', false);
    flushRequests();
    component.processVoiceReportCommand('Qué sucursal tiene más clientes');
    const request = http.expectOne((r) => r.url.endsWith('/reports/voice-command'));
    const parsed = {
      entity: 'patients',
      columns: null,
      group_by: 'branch',
      aggregate: true,
      metric: 'count',
      tenant_ids: ['clinic'],
      branch_ids: ['branch-a'],
      sort_by: 'value',
      sort_order: 'desc',
      limit: 5,
      filters: [],
      currency: null,
    };
    request.flush({
      parsed_request: parsed,
      explanation: 'Comparación por sucursal',
      report_data: {
        entity: 'patients',
        title: 'Clientes por sucursal',
        generated_at: new Date().toISOString(),
        columns: [{ key: 'value', label: 'Cantidad', type: 'number' }],
        rows: [{ branch_name: 'Centro', value: 12 }],
        total_rows: 1,
      },
    });
    flushRequests();
    const plan = component.currentReportRequest();
    expect(plan.group_by).toBe('branch');
    expect(plan.branch_ids).toEqual(['branch-a']);
    expect(plan.limit).toBe(5);
    component.generateReportPreview();
    const preview = http.expectOne((r) => r.url.endsWith('/reports/query'));
    expect(preview.request.body).toEqual(plan);
    preview.flush({ rows: [], columns: [], total_rows: 0 });
    vi.spyOn(TestBed.inject(ReportService), 'downloadBlob').mockImplementation(() => {});
    component.exportReportExcel();
    const excel = http.expectOne((r) => r.url.endsWith('/reports/export/excel'));
    expect(excel.request.body).toEqual(plan);
    excel.flush(new Blob(['excel']));
    component.exportReportPdf();
    const pdf = http.expectOne((r) => r.url.endsWith('/reports/export/pdf'));
    expect(pdf.request.body).toEqual(plan);
    pdf.flush(new Blob(['pdf']));
    component.saveCurrentReport();
    const save = http.expectOne((r) => r.url.endsWith('/reports/saved') && r.method === 'POST');
    expect(save.request.body).toEqual(plan);
    save.flush({ id: 'saved' });
    flushRequests();
  });
  it('discards an interpreted report that completes after leaving reports', () => {
    const component = fixture.componentInstance;
    component.setActiveTab('reportes', false);
    flushRequests();
    component.processVoiceReportCommand('Clientes por sucursal');
    const request = http.expectOne((r) => r.url.endsWith('/reports/voice-command'));
    component.setActiveTab('perfil', false);
    flushRequests();
    const before = component.reportPreviewData();
    request.flush({
      parsed_request: { entity: 'patients', group_by: 'branch' },
      explanation: 'Late response',
      report_data: { rows: [{ value: 999 }], columns: [], total_rows: 1 },
    });
    expect(component.activeTab()).toBe('perfil');
    expect(component.reportPreviewData()).toBe(before);
    flushRequests();
  });
});
