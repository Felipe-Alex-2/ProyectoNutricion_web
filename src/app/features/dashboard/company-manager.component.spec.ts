import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { CompanyManagerComponent } from './company-manager.component';

describe('Bolivia company and branch locations', () => {
  it('accepts catalog selections, clears descendants and saves geographic codes', async () => {
    await TestBed.configureTestingModule({
      imports: [CompanyManagerComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    const fixture = TestBed.createComponent(CompanyManagerComponent);
    fixture.componentInstance.superadmin = true;
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne((r) => r.url.endsWith('/tenants')).flush([]);
    http.expectOne((r) => r.url.endsWith('/administrator-candidates')).flush([]);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const department: HTMLInputElement = fixture.nativeElement.querySelector(
      'app-location-picker input',
    );
    department.value = 'S';
    department.dispatchEvent(new Event('input'));
    expect(component.company.department_code).toBe('');
    department.value = 'Santa Cruz';
    department.dispatchEvent(new Event('input'));
    expect(component.company.department_code).toBe('07');
    fixture.detectChanges();
    department.value = 'C';
    department.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(department.value).toBe('C');
    expect(component.company.department_code).toBe('');
    component.company.initial_province_code = '0701';
    component.company.initial_municipality_code = '070101';
    department.value = 'Chuquisaca';
    department.dispatchEvent(new Event('input'));
    expect(component.company.department_code).toBe('01');
    expect(component.company.initial_province_code).toBe('');
    expect(component.company.initial_municipality_code).toBe('');
    Object.assign(component.company, {
      name: 'NutriSucre',
      code: 'SUCRE',
      administrator_id: 'admin',
      initial_province_code: '0101',
      initial_municipality_code: '010101',
    });
    component.createCompany();
    const request = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/tenants'));
    expect(request.request.body.department_code).toBe('01');
    expect(request.request.body.initial_province_code).toBe('0101');
    expect(request.request.body.initial_municipality_code).toBe('010101');
    request.flush({ detail: 'Fallo simulado' }, { status: 400, statusText: 'Bad Request' });
    component.companies.set([
      { id: 'sucre', department_code: '01' },
      { id: 'scz', department_code: '07' },
    ]);
    component.selected = 'scz';
    Object.assign(component.branch, { province_code: '0101', municipality_code: '010101' });
    component.loadBranches();
    expect(component.branch.province_code).toBe('');
    expect(component.branch.municipality_code).toBe('');
    http.expectOne((r) => r.url.endsWith('/branches')).flush([]);
    fixture.destroy();
    http.verify();
  });
  it('shows a created company immediately and discards an older company list response', async () => {
    await TestBed.configureTestingModule({
      imports: [CompanyManagerComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    const fixture = TestBed.createComponent(CompanyManagerComponent);
    const c = fixture.componentInstance;
    c.superadmin = true;
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    const old = http.expectOne((r) => r.url.endsWith('/tenants'));
    http
      .expectOne((r) => r.url.endsWith('/administrator-candidates'))
      .flush([{ id: 'admin', full_name: 'Admin', email: 'admin@example.com' }]);
    c.companies.set([{ id: 'old', name: 'Empresa existente' }]);
    Object.assign(c.company, {
      name: 'Empresa nueva',
      code: 'NEW',
      administrator_id: 'admin',
      department_code: '01',
      initial_province_code: '0101',
      initial_municipality_code: '010101',
    });
    const changed = vi.fn();
    c.changed.subscribe(changed);
    c.createCompany();
    http
      .expectOne((r) => r.method === 'POST' && r.url.endsWith('/tenants'))
      .flush({ id: 'new', name: 'Empresa nueva', department_code: '01' });
    old.flush([{ id: 'old', name: 'Empresa existente' }]);
    http.expectOne((r) => r.url.endsWith('/branches')).flush([{ id: 'branch', name: 'Principal' }]);
    fixture.detectChanges();
    expect(c.companies().map((row) => row.id)).toEqual(['new', 'old']);
    expect(c.selected).toBe('new');
    expect(changed).toHaveBeenCalledWith(expect.objectContaining({ id: 'new' }));
    expect(c.candidates()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Empresa nueva');
    fixture.destroy();
    http.verify();
  });
});
