import { signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
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
  it('rejects empty and duplicate values and unlocks after a server timeout', async () => {
    await TestBed.configureTestingModule({
      imports: [CompanyManagerComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    const fixture = TestBed.createComponent(CompanyManagerComponent);
    const c = fixture.componentInstance;
    c.superadmin = true;
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne((r) => r.url.endsWith('/tenants'))
      .flush([{ id: 'old', name: 'Mi Clínica', code: 'OLD' }]);
    http.expectOne((r) => r.url.endsWith('/branches')).flush([]);
    http.expectOne((r) => r.url.endsWith('/administrator-candidates')).flush([{ id: 'admin' }]);
    Object.assign(c.company, {
      name: '   ',
      code: 'NEW',
      administrator_id: 'admin',
      department_code: '01',
      initial_province_code: '0101',
      initial_municipality_code: '010101',
    });
    c.createCompany();
    expect(c.companyError()).toContain('nombre');
    expect(c.busy()).toBe(false);
    c.company.name = '  MI   clínica ';
    c.createCompany();
    expect(c.companyError()).toContain('Ya existe');
    http.expectNone((r) => r.method === 'POST');
    c.company.name = 'Empresa nueva';
    vi.useFakeTimers();
    try {
      c.createCompany();
      const pending = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/tenants'));
      expect(c.busy()).toBe(true);
      vi.advanceTimersByTime(30001);
      expect(c.busy()).toBe(false);
      expect(pending.cancelled).toBe(true);
      expect(c.companyError()).toContain('no respondió a tiempo');
      expect(c.company.name).toBe('Empresa nueva');
    } finally {
      vi.useRealTimers();
      fixture.destroy();
      http.verify();
    }
  });
  it('uses the profile company for staff and keeps generated codes free of spaces', async () => {
    const user = signal({ tenant_id: 'first', active_tenant_id: 'second' });
    await TestBed.configureTestingModule({
      imports: [CompanyManagerComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { currentUser: user } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(CompanyManagerComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne((r) => r.url.endsWith('/tenants'))
      .flush([
        { id: 'first', name: 'Primera', code: 'CLINICA' },
        { id: 'second', name: 'Segunda', code: 'CLINICA-2' },
      ]);
    http.expectOne((r) => r.url.endsWith('/branches')).flush([]);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.selected).toBe('second');
    expect(fixture.nativeElement.querySelector('select[name="selectedCompany"]')).toBeNull();
    expect(c.generateCompanyCode('Clínica')).toBe('CLINICA-3');
    expect(c.generateCompanyCode('A')).toBe('EMP-A');
    user.set({ tenant_id: 'first', active_tenant_id: 'first' });
    fixture.detectChanges();
    const branches = http.expectOne((r) => r.url.endsWith('/branches'));
    expect(branches.request.params.get('tenant_id')).toBe('first');
    branches.flush([]);
    expect(c.selected).toBe('first');
    fixture.destroy();
    http.verify();
  });
});
