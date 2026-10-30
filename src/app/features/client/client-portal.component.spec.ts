import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { signal } from '@angular/core';
import { ClientPortalComponent } from './client-portal.component';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';

describe('Patient web space', () => {
  let fixture: ComponentFixture<ClientPortalComponent>;
  let http: HttpTestingController;
  let query: BehaviorSubject<Record<string, string>>;
  beforeEach(async () => {
    query = new BehaviorSubject<Record<string, string>>({});
    await TestBed.configureTestingModule({
      imports: [ClientPortalComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { queryParams: query } },
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({
              id: 'patient-a',
              full_name: 'Ana Prueba',
              email: 'ana@example.test',
              role_id: 'CLIENTE',
              tenant_id: 'clinic-a',
            }),
            logout: vi.fn(),
          },
        },
        { provide: ThemeService, useValue: { isDarkMode: signal(false), toggleTheme: vi.fn() } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ClientPortalComponent);
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/plans/my-plan')).flush(null);
    http.expectOne((r) => r.url.endsWith('/appointments')).flush([]);
    http.expectOne((r) => r.url.endsWith('/patient-links/my-nutritionist')).flush(null);
    http.expectOne((r) => r.url.endsWith('/clinical/anamnesis/me')).flush(null);
    await new Promise((resolve) => setTimeout(resolve, 5));
    http.expectOne((r) => r.url.endsWith('/notifications/unread-count')).flush({ unread_count: 0 });
    fixture.detectChanges();
  });
  afterEach(() => {
    fixture.destroy();
    http.verify();
  });
  it('keeps administrative query parameters out of the patient navigation', () => {
    query.next({ tab: 'sprint1-tenants' });
    fixture.detectChanges();
    expect(fixture.componentInstance.tab()).toBe('inicio');
    expect(fixture.nativeElement.textContent).toContain('Hola, Ana.');
    expect(fixture.nativeElement.querySelector('.sidebar')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Gestionar Tenants');
  });
  it('loads only assigned recipes and the personal weekly menu', () => {
    query.next({ tab: 'plan' });
    http.expectOne((r) => r.url.endsWith('/recipes/my-plan')).flush([]);
    http.expectOne((r) => r.url.endsWith('/menu-semanal/current')).flush(null);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Tu plan está por comenzar');
    http.expectNone((r) => r.url.endsWith('/recipes'));
  });
  it('requires health consent and valid measurements before saving', () => {
    const component = fixture.componentInstance;
    component.healthForm.patchValue({ weight_kg: 70, height_cm: 170, goal: 'Mejorar hábitos' });
    component.saveHealth();
    expect(component.healthForm.invalid).toBe(true);
    http.expectNone((r) => r.method === 'POST');
    component.healthForm.patchValue({ consent_data_processing: true, birth_date: '1990-01-02' });
    component.saveHealth();
    const request = http.expectOne(
      (r) => r.method === 'POST' && r.url.endsWith('/clinical/anamnesis/me'),
    );
    expect(request.request.body.birth_date).toBe('1990-01-02T00:00:00');
    expect(request.request.body.consent_data_processing).toBe(true);
    request.flush({ ...request.request.body, id: 'health-a', patient_id: 'patient-a' });
    expect(component.success()).toContain('guardó');
  });
  it('does not replace a failed health load with an empty editable record', () => {
    // Recreate with a failing health request, as happens during a backend outage.
    fixture.destroy();
    fixture = TestBed.createComponent(ClientPortalComponent);
    query.next({ tab: 'salud' });
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/plans/my-plan')).flush(null);
    http.expectOne((r) => r.url.endsWith('/appointments')).flush([]);
    http.expectOne((r) => r.url.endsWith('/patient-links/my-nutritionist')).flush(null);
    http
      .expectOne((r) => r.url.endsWith('/clinical/anamnesis/me'))
      .flush({ detail: 'Servicio no disponible' }, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('fieldset').disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Servicio no disponible');
  });
  it('rejects oversized or unsupported photos before any upload', () => {
    const component = fixture.componentInstance;
    component.choosePhoto({
      target: { files: [new File(['x'], 'document.pdf', { type: 'application/pdf' })] },
    } as unknown as Event);
    expect(component.photo()).toBeNull();
    expect(component.error()).toContain('JPG');
    component.analyzePhoto();
    http.expectNone((r) => r.url.endsWith('/food/analyze'));
  });
  it('does not display a late chat error on a different page', () => {
    query.next({ tab: 'asistente' });
    http.expectOne((r) => r.url.endsWith('/chat/history')).flush({ messages: [] });
    fixture.componentInstance.chatForm.patchValue({ message: 'Una pregunta de prueba' });
    fixture.componentInstance.sendMessage();
    const response = http.expectOne((r) => r.url.endsWith('/chat') && r.method === 'POST');
    query.next({ tab: 'perfil' });
    response.flush({ detail: 'Error anterior del chat' }, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(fixture.componentInstance.error()).toBe('');
    expect(fixture.componentInstance.tab()).toBe('perfil');
    expect(fixture.nativeElement.querySelector('.chat-card')).toBeNull();
  });
});
