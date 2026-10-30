import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ModalRestaurarBackupComponent } from './modal-restaurar-backup.component';

describe('Operational backup review', () => {
  let fixture: ComponentFixture<ModalRestaurarBackupComponent>;
  let http: HttpTestingController;
  const summary = {
    review_token: 'signed-review',
    missing: 1,
    existing: 3,
    skipped: 0,
    tables: [
      {
        table: 'payments',
        label: 'Cobros confirmados',
        missing: 1,
        existing: 3,
        skipped: 0,
        in_file: 4,
      },
    ],
    warnings: [],
  };
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalRestaurarBackupComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(ModalRestaurarBackupComponent);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    fixture.destroy();
    http.verify();
  });
  function open() {
    fixture.componentRef.setInput('tenantId', 'company-a');
    fixture.componentRef.setInput('restoreFile', new File(['encrypted'], 'copy.json'));
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    const request = http.expectOne((r) => r.url.endsWith('/backup/preview'));
    expect(request.request.params.get('tenant_id')).toBe('company-a');
    request.flush(summary);
    fixture.detectChanges();
  }
  it('shows missing and existing records before accepting a password', () => {
    open();
    expect(fixture.nativeElement.textContent).toContain('1 por recuperar');
    expect(fixture.nativeElement.textContent).toContain('3 ya existentes');
    fixture.componentInstance.confirmarRestauracion();
    http.expectNone((r) => r.url.endsWith('/restore'));
  });
  it('submits the reviewed file, company and account password', () => {
    open();
    const component = fixture.componentInstance;
    component.password = 'Password123!';
    component.confirmarRestauracion();
    const request = http.expectOne((r) => r.url.endsWith('/backup/restore'));
    expect(request.request.params.get('tenant_id')).toBe('company-a');
    const body = request.request.body as FormData;
    expect(body.get('review_token')).toBe('signed-review');
    expect(body.get('password')).toBe('Password123!');
    request.flush({
      success: true,
      message: 'Recuperado',
      records_restored: 1,
      tables_restored: 1,
    });
    expect(component.password).toBe('');
  });
  it('requires a selected company before preview', () => {
    fixture.componentRef.setInput('restoreFile', new File(['encrypted'], 'copy.json'));
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    http.expectNone((r) => r.url.endsWith('/preview'));
    expect(fixture.nativeElement.textContent).toContain('Selecciona la empresa');
  });
});
