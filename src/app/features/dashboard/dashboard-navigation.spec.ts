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
  it('opens an accepted consultation in checkout and pays through its appointment', () => {
    const component = fixture.componentInstance;
    const appointment: any = {id:'visit', patient_id:'p',patient_name:'Ana Paciente',patient_email:'patient@example.test',tenant_id:'clinic',branch_id:'branch',status:'ACCEPTED'};
    component.prepareAppointmentPayment(appointment);
    flushRequests();
    expect(component.activeTab()).toBe('suscripcion');
    expect(component.paymentForm.value.amount).toBe(5);
    expect(component.paymentForm.value.customer_email).toBe('patient@example.test');
    component.onSubmitPayment();
    const request=http.expectOne(r=>r.url.endsWith('/appointments/visit/pay'));
    expect(request.request.body).toEqual({method:'EFECTIVO'});
    request.flush({status:'COMPLETED',payment_id:'charge'});
    expect(component.consultationToPay()).toBeNull();
    expect(component.paymentSuccess()).toContain('Cita confirmada');
    expect(component.isCreatingPayment()).toBe(false);
  });
  it('shows payment status and opens in-person checkout with customer data', () => {
    const c=fixture.componentInstance;
    c.setActiveTab('citas',false);
    flushRequests();
    c.appointments.set([
      {id:'unpaid',patient_id:'p1',nutritionist_id:'n',patient_name:'Pendiente presencial',scheduled_at:'2026-12-01T12:00:00Z',status:'ACCEPTED',payment_status:'UNPAID',payment_preference:'PRESENCIAL',created_at:'2026-10-31',updated_at:'2026-10-31'},
      {id:'paid',patient_id:'p2',nutritionist_id:'n',patient_name:'Cliente pagado',scheduled_at:'2026-12-01T13:00:00Z',status:'CONFIRMED',payment_status:'PAID',payment_preference:'ONLINE',payment_method:'WALLET',created_at:'2026-10-31',updated_at:'2026-10-31'},
    ]);
    fixture.detectChanges();
    const cells=Array.from(fixture.nativeElement.querySelectorAll('.appointment-payment-cell')) as HTMLElement[];
    expect(cells.length).toBe(2);
    expect(cells.some(cell=>cell.textContent?.includes('No pagado') && cell.textContent?.includes('Presencial'))).toBe(true);
    expect(cells.some(cell=>cell.textContent?.includes('Pagado') && cell.textContent?.includes('Wallet'))).toBe(true);
    const collect = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b: any) => b.textContent.includes('Cobrar USD 5')) as HTMLButtonElement;
    expect(collect).toBeTruthy();
    collect.click();
    flushRequests();
    expect(c.activeTab()).toBe('suscripcion');
    expect(c.consultationToPay()?.id).toBe('unpaid');
    expect(c.paymentForm.value.customer_name).toBe('Pendiente presencial');
    expect(c.paymentForm.value.amount).toBe(5);
    expect(c.paymentForm.value.payment_method).toBe('EFECTIVO');
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
  it('validates manual columns and dates, hides the notes banner, and blocks stale exports', () => {
    const component = fixture.componentInstance;
    const service = TestBed.inject(ReportService);
    component.setActiveTab('reportes', false);
    flushRequests();
    const columns = [
      { key: 'patient_name', label: 'Paciente', type: 'string' },
      { key: 'diagnosis', label: 'Diagnóstico', type: 'string' },
    ];
    service.entities.set([
      {
        entity: 'clinical_records',
        label: 'Fichas clínicas',
        description: 'Evaluaciones',
        available_columns: columns,
      },
    ]);
    component.reportStatusFilter.set('CONFIRMED');
    component.reportStartDate.set('2026-10-31');
    component.reportEndDate.set('2026-10-31');
    component.onReportEntityChange('clinical_records');
    const request = http.expectOne((r) => r.url.endsWith('/reports/query'));
    expect(request.request.body.columns).toEqual(['patient_name', 'diagnosis']);
    expect(request.request.body.status).toBeUndefined();
    request.flush({
      entity: 'clinical_records',
      title: 'Fichas',
      columns,
      rows: [{ patient_name: 'Ana', diagnosis: 'Control' }],
      total_rows: 1,
      notes: [
        'Datos limitados a las empresas, sucursales y pacientes autorizados.',
        'Periodo en Bolivia (UTC−4): 2026-10-31 a 2026-10-31.',
      ],
    });
    fixture.detectChanges();
    flushRequests();
    expect(fixture.nativeElement.querySelector('#report-status')).toBeNull();
    expect(fixture.nativeElement.querySelector('select[multiple]')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Datos limitados a las empresas');
    expect(component.reportPreviewIsCurrent()).toBe(true);
    component.reportSearch.set('Ana');
    component.exportReportExcel();
    http.expectNone((r) => r.url.endsWith('/reports/export/excel'));
    expect(component.reportError()).toContain('Genera la vista previa');
    component.deselectAllReportColumns();
    http.expectNone((r) => r.url.endsWith('/reports/query'));
    expect(component.reportError()).toContain('al menos una columna');
    expect(component.reportPreviewData()).toBeNull();
    component.reportStartDate.set('2026-11-01');
    component.selectAllReportColumns();
    http.expectNone((r) => r.url.endsWith('/reports/query'));
    expect(component.reportError()).toContain('fecha inicial');
  });
  it('keeps detailed rows separate from summary calculations and lets the user choose the numeric field', () => {
    const component = fixture.componentInstance;
    const service = TestBed.inject(ReportService);
    component.setActiveTab('reportes', false);
    flushRequests();
    service.entities.set([
      {
        entity: 'recipes',
        label: 'Recetas',
        description: 'Recetas',
        available_columns: [
          { key: 'title', label: 'Receta', type: 'string' },
          { key: 'calories', label: 'Calorías', type: 'number' },
          { key: 'protein', label: 'Proteína', type: 'number' },
        ],
      },
    ]);
    component.onReportEntityChange('recipes');
    flushRequests();
    component.setReportMode('summary');
    flushRequests();
    component.setReportMetric('average');
    const average = http.expectOne((r) => r.url.endsWith('/reports/query'));
    expect(average.request.body.aggregate).toBe(true);
    expect(average.request.body.value_field).toBe('calories');
    average.flush({ rows: [], columns: [], total_rows: 0 });
    component.setReportValueField('protein');
    const protein = http.expectOne((r) => r.url.endsWith('/reports/query'));
    expect(protein.request.body.value_field).toBe('protein');
    protein.flush({ rows: [], columns: [], total_rows: 0 });
    component.setReportMode('list');
    const list = http.expectOne((r) => r.url.endsWith('/reports/query'));
    expect(list.request.body.aggregate).toBe(false);
    expect(list.request.body.metric).toBe('count');
    expect(list.request.body.group_by).toBeNull();
    list.flush({ rows: [], columns: [], total_rows: 0 });
    expect(component.isReportSummary()).toBe(false);
  });
});
