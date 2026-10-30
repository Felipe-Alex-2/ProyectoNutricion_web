import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { NutritionDiaryComponent } from './nutrition-diary.component';

describe('Nutrition diary', () => {
  function setup(role = 'CLIENTE') {
    TestBed.configureTestingModule({
      imports: [NutritionDiaryComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: { currentUser: signal({ id: 'patient', role_id: role }) },
        },
      ],
    });
    const fixture = TestBed.createComponent(NutritionDiaryComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/food/history')).flush([]);
    return { fixture, http, component: fixture.componentInstance };
  }
  it('keeps the UUID on retry after a lost response', () => {
    const { fixture, http, component } = setup();
    component.form.patchValue({ description: 'Pollo y arroz', calories: 450 });
    component.save();
    const first = http.expectOne((r) => r.url.endsWith('/food/records'));
    const id = first.request.body.client_record_id;
    expect(first.request.body.patient_id).toBeUndefined();
    first.flush({}, { status: 503, statusText: 'Unavailable' });
    component.save();
    const retry = http.expectOne((r) => r.url.endsWith('/food/records'));
    expect(retry.request.body.client_record_id).toBe(id);
    retry.flush({ id: 'record' });
    http.expectOne((r) => r.url.endsWith('/food/history')).flush([]);
    expect(component.success()).toContain('registrada');
    fixture.destroy();
    http.verify();
  });
  it('prevents invalid meal values before upload', () => {
    const { fixture, http, component } = setup();
    component.form.patchValue({ description: 'Comida', calories: -1 });
    component.save();
    http.expectNone((r) => r.method === 'POST');
    expect(component.form.invalid).toBe(true);
    fixture.destroy();
    http.verify();
  });
  it('includes the selected patient in staff history and prevents manual impersonation', () => {
    const { fixture, http, component } = setup('NUTRICIONISTA');
    http
      .expectOne((r) => r.url.endsWith('/users/patients'))
      .flush([{ id: 'linked', full_name: 'Ana' }]);
    component.selectPatient('linked');
    http
      .expectOne((r) => r.url.endsWith('/food/history') && r.params.get('patient_id') === 'linked')
      .flush([]);
    component.form.patchValue({ description: 'Comida' });
    component.save();
    http.expectNone((r) => r.url.endsWith('/food/records'));
    fixture.destroy();
    http.verify();
  });
});
