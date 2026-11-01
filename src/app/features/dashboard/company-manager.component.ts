import {
  Component,
  Input,
  OnInit,
  signal,
  Output,
  EventEmitter,
  inject,
  effect,
} from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { finalize, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BOLIVIA_LOCATIONS } from '../../core/data/bolivia-locations';
import { LocationPickerComponent } from '../../shared/ui/location-picker.component';
@Component({
  selector: 'app-company-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, LocationPickerComponent],
  template: ` <section class="company-panel">
      <div class="panel-header">
        <div>
          <h2>{{ superadmin ? 'Empresas y sucursales' : 'Sucursales de tu empresa' }}</h2>
          <p>Cada empresa mantiene separados sus pacientes, cobros, planes y reportes.</p>
        </div>
        <button type="button" (click)="load()" [disabled]="busy()">
          Actualizar lista de empresas
        </button>
      </div>
      @if (error()) {
        <p role="alert" class="alert-error-box">{{ error() }}</p>
      }
      @if (message()) {
        <p role="status" class="alert-success-box">{{ message() }}</p>
      }
      @if (superadmin) {
        <details>
          <summary>Preparar cuenta de administrador</summary>
          @if (adminError()) {
            <p role="alert" class="company-feedback">{{ adminError() }}</p>
          }
          <form (ngSubmit)="createAdmin()">
            <label
              >Nombre *
              <input
                name="adminName"
                [(ngModel)]="admin.full_name"
                (blur)="adminTouched.name = true"
                required
                minlength="2"
                placeholder="Ej: Ana Gómez"
              />
              @if ((adminTouched.name || adminSubmitted()) && admin.full_name.trim().length < 2) {
                <small class="field-error"
                  >El nombre no puede quedar vacío (mínimo 2 caracteres).</small
                >
              }
            </label>
            <label
              >Correo *
              <input
                name="adminEmail"
                [(ngModel)]="admin.email"
                (blur)="adminTouched.email = true"
                type="email"
                required
                placeholder="admin@clinica.com"
              />
              @if ((adminTouched.email || adminSubmitted()) && !isValidEmail(admin.email)) {
                <small class="field-error"
                  >Ingresa un correo electrónico válido (no puede quedar vacío).</small
                >
              }
            </label>
            <label
              >Contraseña inicial *
              <input
                name="adminPassword"
                [(ngModel)]="admin.password"
                (blur)="adminTouched.password = true"
                type="password"
                autocomplete="new-password"
                required
                minlength="8"
                placeholder="Mínimo 8 caracteres"
              />
              @if (
                (adminTouched.password || adminSubmitted()) && !isValidPassword(admin.password)
              ) {
                <small class="field-error"
                  >La contraseña requiere mínimo 8 caracteres, mayúscula, minúscula, número y
                  símbolo.</small
                >
              }
            </label>
            <button type="submit" [disabled]="busy()">Crear cuenta de administrador</button>
          </form>
        </details>
        <details open>
          <summary>Crear empresa</summary>
          @if (candidates().length === 0) {
            <div class="hint-banner">
              ⚠️ <strong>Paso previo:</strong> Para crear una empresa necesitas asignarle una cuenta
              de administrador disponible. Despliega arriba
              <em>"Preparar cuenta de administrador"</em> y crea una cuenta primero.
            </div>
          }
          <form (ngSubmit)="createCompany()">
            @if (companyError()) {
              <p role="alert" class="company-feedback full-span">{{ companyError() }}</p>
            }
            <label
              >Nombre de la empresa *
              <input
                name="name"
                [(ngModel)]="company.name"
                (ngModelChange)="onCompanyNameChange($event)"
                (blur)="companyTouched.name = true"
                required
                minlength="2"
                placeholder="Ej: Clínica NutriSalud"
              />
              @if ((companyTouched.name || companySubmitted()) && company.name.trim().length < 2) {
                <small class="field-error"
                  >El nombre de la empresa no puede quedar vacío (mínimo 2 caracteres).</small
                >
              }
            </label>
            <label
              >Código multitenant (automático)
              <input
                name="code"
                [(ngModel)]="company.code"
                readonly
                class="readonly-code-input"
                placeholder="Se genera al escribir el nombre"
              />
              <small class="field-hint">Generado automáticamente a partir del nombre.</small>
            </label>
            <div>
              <app-location-picker
                label="Departamento de la empresa *"
                [options]="locations"
                [value]="company.department_code"
                (valueChange)="changeDepartment($event)"
              />
              @if ((companyTouched.department || companySubmitted()) && !company.department_code) {
                <small class="field-error"
                  >Debes escribir y seleccionar un departamento válido de la lista.</small
                >
              }
            </div>
            <label
              >Administrador responsable *
              <select
                name="administrator"
                [(ngModel)]="company.administrator_id"
                (blur)="companyTouched.admin = true"
                required
              >
                <option value="">Selecciona una cuenta disponible</option>
                @for (a of candidates(); track a.id) {
                  <option [value]="a.id">{{ a.full_name }} · {{ a.email }}</option>
                }
              </select>
              @if ((companyTouched.admin || companySubmitted()) && !company.administrator_id) {
                <small class="field-error"
                  >Selecciona un administrador responsable (prepara una cuenta arriba si la lista
                  está vacía).</small
                >
              }
            </label>
            <label
              >Primera sucursal *
              <input
                name="initialBranch"
                [(ngModel)]="company.initial_branch_name"
                (blur)="companyTouched.branchName = true"
                required
                minlength="2"
                placeholder="Sucursal principal"
              />
              @if (
                (companyTouched.branchName || companySubmitted()) &&
                company.initial_branch_name.trim().length < 2
              ) {
                <small class="field-error"
                  >El nombre de la primera sucursal no puede quedar vacío (mínimo 2
                  caracteres).</small
                >
              }
            </label>
            <div>
              <app-location-picker
                label="Provincia de la primera sucursal *"
                [options]="provinces(company.department_code)"
                [disabled]="!company.department_code"
                [value]="company.initial_province_code"
                (valueChange)="
                  company.initial_province_code = $event; company.initial_municipality_code = ''
                "
              />
              @if (
                (companyTouched.province || companySubmitted()) && !company.initial_province_code
              ) {
                <small class="field-error">Selecciona una provincia de la lista.</small>
              }
            </div>
            <div>
              <app-location-picker
                label="Municipio de la primera sucursal *"
                [options]="municipalities(company.department_code, company.initial_province_code)"
                [disabled]="!company.initial_province_code"
                [(value)]="company.initial_municipality_code"
              />
              @if (
                (companyTouched.municipality || companySubmitted()) &&
                !company.initial_municipality_code
              ) {
                <small class="field-error">Selecciona un municipio de la lista.</small>
              }
            </div>
            <button type="submit" [disabled]="busy()">
              {{ busy() ? 'Procesando…' : 'Crear empresa y asignar administrador' }}
            </button>
          </form>
        </details>
      }
      @if (superadmin) {
        <label
          >Empresa<select
            name="selectedCompany"
            [(ngModel)]="selected"
            (ngModelChange)="loadBranches()"
          >
            <option value="">Selecciona una empresa</option>
            @for (c of companies(); track c.id) {
              <option [value]="c.id">{{ c.name }} · {{ departmentName(c.department_code) }}</option>
            }
          </select></label
        >
      } @else {
        <p><strong>Empresa:</strong> {{ selectedCompanyName() }}</p>
      }
      @if (selected) {
        <p><strong>Departamento:</strong> {{ departmentName(selectedDepartment()) }}</p>
        @if (!selectedDepartment()) {
          <p role="status">
            El superadmin debe editar esta empresa y registrar su departamento antes de ubicar sus
            sucursales.
          </p>
        }
        @if (superadmin) {
          <div class="branches-section">
            <div class="branches-header">
              <h3>Sucursales registradas ({{ selectedCompanyName() }})</h3>
              <span class="branches-count">{{ branches().length }} registrada(s)</span>
            </div>
            @if (branches().length > 0) {
              <div class="branches-grid">
                @for (b of branches(); track b.id) {
                  <article class="branch-card" [class.editing]="editingBranch === b.id">
                    <div class="branch-card-header">
                      <div class="branch-icon" aria-hidden="true">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <path d="M3 21h18" />
                          <path d="M5 21V7l8-4v18" />
                          <path d="M19 21V11l-6-4" />
                          <path d="M9 9v.01" />
                          <path d="M9 12v.01" />
                          <path d="M9 15v.01" />
                          <path d="M9 18v.01" />
                        </svg>
                      </div>
                      <div class="branch-title-wrap">
                        <strong class="branch-name">{{ b.name }}</strong>
                        <span class="branch-code-badge">Código: {{ b.code }}</span>
                      </div>
                      <span class="branch-status">{{
                        b.is_active === false ? 'Inactiva' : 'Activa'
                      }}</span>
                    </div>
                    <div class="branch-meta">
                      <div class="branch-meta-row">
                        <span>Empresa:</span>
                        <strong>{{ selectedCompanyName() }}</strong>
                      </div>
                      <div class="branch-meta-row">
                        <span>Departamento:</span>
                        <strong>{{ departmentName(selectedDepartment()) }}</strong>
                      </div>
                      <div class="branch-meta-row">
                        <span>Ubicación:</span>
                        <strong>{{ branchLocation(b) }}</strong>
                      </div>
                      <div class="branch-meta-row">
                        <span>Dirección:</span>
                        <strong>{{ b.address || 'No especificada' }}</strong>
                      </div>
                    </div>
                    <div class="branch-card-actions">
                      <button
                        type="button"
                        class="btn-branch-edit"
                        [disabled]="busy() || !selectedDepartment()"
                        (click)="editBranch(b)"
                      >
                        Editar ubicación y datos
                      </button>
                    </div>
                  </article>
                }
              </div>
            } @else {
              <p class="empty-branches">Sin sucursales registradas.</p>
            }
          </div>
        }
        <form (ngSubmit)="createBranch()">
          <h3 class="full-span">{{ editingBranch ? 'Editar sucursal' : 'Nueva sucursal' }}</h3>
          @if (branchError()) {
            <p role="alert" class="company-feedback full-span">{{ branchError() }}</p>
          }
          <label
            >Nombre *
            <input
              name="branchName"
              [(ngModel)]="branch.name"
              (ngModelChange)="onBranchNameChange($event)"
              (blur)="branchTouched.name = true"
              required
              minlength="2"
              placeholder="Ej: Sucursal Norte"
            />
            @if ((branchTouched.name || branchSubmitted()) && branch.name.trim().length < 2) {
              <small class="field-error"
                >El nombre de la sucursal no puede quedar vacío (mínimo 2 caracteres).</small
              >
            }
          </label>
          <label
            >Código (automático)
            <input
              name="branchCode"
              [(ngModel)]="branch.code"
              readonly
              class="readonly-code-input"
              placeholder="Se genera al escribir el nombre"
            />
            <small class="field-hint">Generado automáticamente.</small>
          </label>
          <label
            >Dirección
            <input
              name="branchAddress"
              [(ngModel)]="branch.address"
              placeholder="Ej: Av. Principal #123"
            />
          </label>
          <div>
            <app-location-picker
              label="Provincia *"
              [options]="provinces(selectedDepartment())"
              [disabled]="!selectedDepartment()"
              [value]="branch.province_code"
              (valueChange)="branch.province_code = $event; branch.municipality_code = ''"
            />
            @if ((branchTouched.province || branchSubmitted()) && !branch.province_code) {
              <small class="field-error">Selecciona una provincia de la lista.</small>
            }
          </div>
          <div>
            <app-location-picker
              label="Municipio *"
              [options]="municipalities(selectedDepartment(), branch.province_code)"
              [disabled]="!branch.province_code"
              [(value)]="branch.municipality_code"
            />
            @if ((branchTouched.municipality || branchSubmitted()) && !branch.municipality_code) {
              <small class="field-error">Selecciona un municipio de la lista.</small>
            }
          </div>
          <div class="branch-submit-actions">
            <button type="submit" [disabled]="busy()">
              {{ editingBranch ? 'Guardar sucursal' : 'Crear sucursal' }}
            </button>
            @if (editingBranch) {
              <button
                type="button"
                class="btn-secondary"
                (click)="resetBranch()"
                [disabled]="busy()"
              >
                Cancelar edición
              </button>
            }
          </div>
        </form>
      }
    </section>
    @if (!superadmin && selected) {
      <section class="branches-registered-showcase">
        <header class="branches-showcase-header">
          <div>
            <h2 class="branches-page-title">Sucursales registradas</h2>
            <p class="branches-page-subtitle">
              Sucursales de {{ selectedCompanyName() }} ({{ branches().length }})
            </p>
          </div>
        </header>
        @if (branches().length > 0) {
          <div class="branches-grid">
            @for (b of branches(); track b.id) {
              <article class="branch-card" [class.editing]="editingBranch === b.id">
                <div class="branch-card-header">
                  <div class="branch-title-wrap">
                    <strong class="branch-name">{{ b.name }}</strong>
                    <span class="branch-code-badge">Código: {{ b.code }}</span>
                  </div>
                  <span class="branch-status">{{
                    b.is_active === false ? 'Inactiva' : 'Activa'
                  }}</span>
                </div>
                <p class="branch-desc">Sucursal operativa de {{ selectedCompanyName() }}</p>
                <div class="branch-meta">
                  <div class="branch-meta-row">
                    <span>Departamento:</span
                    ><strong>{{ departmentName(selectedDepartment()) }}</strong>
                  </div>
                  <div class="branch-meta-row">
                    <span>Ubicación:</span><strong>{{ branchLocation(b) }}</strong>
                  </div>
                  <div class="branch-meta-row">
                    <span>Dirección:</span><strong>{{ b.address || 'No especificada' }}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  class="btn-branch-edit"
                  [disabled]="busy() || !selectedDepartment()"
                  (click)="editBranch(b)"
                >
                  Editar ubicación y datos
                </button>
              </article>
            }
          </div>
        } @else {
          <p class="empty-branches">Sin sucursales registradas para esta empresa.</p>
        }
      </section>
    }`,
  styles: [
    `
      :host {
        display: block;
      }
      .company-panel {
        background: var(--color-surface, #fff);
        padding: 24px;
        border-radius: 24px;
        margin: 16px 0;
        color: var(--color-text, #12343b);
      }
      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        flex-wrap: wrap;
      }
      .panel-header h2 {
        margin: 0 0 4px;
      }
      .panel-header p {
        margin: 0;
      }
      form {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: 16px;
        margin: 20px 0;
        align-items: start;
      }
      .full-span {
        grid-column: 1 / -1;
        margin: 0;
      }
      label {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin: 4px 0;
        font-weight: 600;
      }
      input,
      select {
        font: inherit;
        font-weight: 400;
        min-height: 44px;
        padding: 10px;
        border: 1px solid var(--color-border, #ccdede);
        border-radius: 12px;
        background: var(--color-surface, #fff);
        color: inherit;
        box-sizing: border-box;
        width: 100%;
      }
      button {
        min-height: 44px;
        background: var(--color-primary, #087f77);
        color: white;
        border: 0;
        border-radius: 16px;
        padding: 12px 18px;
        cursor: pointer;
        align-self: end;
        font-weight: 600;
      }
      button:disabled {
        opacity: 0.5;
        cursor: wait;
      }
      .btn-secondary {
        background: #e2eceb;
        color: #12343b;
      }
      summary {
        cursor: pointer;
        padding: 16px 0;
        font-weight: 600;
      }
      details {
        border-bottom: 1px solid var(--color-border, #ccdede);
      }
      .field-error {
        color: #b3261e;
        font-size: 12px;
        font-weight: 500;
        line-height: 1.35;
      }
      .field-hint {
        color: #526970;
        font-size: 11.5px;
        font-weight: 400;
        line-height: 1.3;
      }
      .readonly-code-input {
        background: #f2f7f7;
        color: #087f77;
        font-weight: 600;
        cursor: default;
      }
      .company-feedback,
      .alert-error-box {
        background: #fdecea;
        color: #b3261e;
        border: 1px solid #f5c2c0;
        padding: 10px 14px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 500;
        margin: 8px 0;
      }
      .alert-success-box {
        background: #e6f6f3;
        color: #065f58;
        border: 1px solid #a9ded8;
        padding: 10px 14px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 500;
        margin: 8px 0;
      }
      .hint-banner {
        background: #fff8e6;
        color: #6b4e00;
        border: 1px solid #f1d48a;
        padding: 10px 14px;
        border-radius: 12px;
        font-size: 13px;
        margin: 8px 0;
      }
      .branches-section {
        margin: 18px 0;
      }
      .branches-registered-showcase {
        margin: 24px 0;
      }
      .branches-showcase-header {
        margin-bottom: 16px;
      }
      .branches-header-tag {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: #087f77;
        text-transform: uppercase;
        margin-bottom: 4px;
      }
      .branches-page-title {
        margin: 0 0 4px;
        font-size: 22px;
        font-weight: 700;
        color: var(--color-text, #12343b);
      }
      .branches-page-subtitle {
        margin: 0;
        font-size: 13.5px;
        color: #526970;
      }
      .branches-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }
      .branches-header h3 {
        margin: 0;
        font-size: 16px;
      }
      .branches-count {
        font-size: 12px;
        font-weight: 600;
        color: #087f77;
        background: #e6f6f3;
        padding: 4px 10px;
        border-radius: 999px;
      }
      .branches-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 14px;
        grid-template-columns: repeat(auto-fill, minmax(270px, 320px));
        gap: 16px;
      }
      .branch-card {
        border: 1px solid var(--color-border, #ccdede);
        border-radius: 18px;
        padding: 16px;
        border-radius: 20px;
        padding: 18px;
        background: var(--color-surface, #fff);
        display: flex;
        flex-direction: column;
        gap: 12px;
        box-shadow: 0 2px 8px rgba(18, 52, 59, 0.04);
        box-shadow: 0 4px 14px rgba(18, 52, 59, 0.06);
      }
      .branch-desc {
        margin: 0;
        font-size: 12.5px;
        color: #526970;
      }
      .branch-card.editing {
        border-color: var(--color-primary, #087f77);
        box-shadow: 0 0 0 2px rgba(8, 127, 119, 0.18);
      }
      .branch-card-header {
        display: flex;
        align-items: flex-start;
        gap: 10px;
      }
      .branch-icon {
        width: 38px;
        height: 38px;
        border-radius: 12px;
        background: #e6f6f3;
        color: #087f77;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: none;
      }
      .branch-title-wrap {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
        flex: 1;
      }
      .branch-name {
        font-size: 15px;
        line-height: 1.25;
        word-break: break-word;
      }
      .branch-code-badge {
        display: inline-block;
        align-self: flex-start;
        font-size: 11px;
        font-weight: 600;
        color: #087f77;
        background: #e6f6f3;
        padding: 2px 8px;
        border-radius: 6px;
      }
      .branch-status {
        font-size: 11px;
        font-weight: 600;
        color: #0d7a49;
        background: #e4f7ed;
        padding: 3px 9px;
        border-radius: 999px;
      }
      .branch-meta {
        background: #f5f9f9;
        border-radius: 12px;
        padding: 10px 12px;
        display: grid;
        gap: 6px;
        font-size: 12.5px;
      }
      .branch-meta-row {
        display: flex;
        justify-content: space-between;
        gap: 8px;
      }
      .branch-meta-row span {
        color: #526970;
      }
      .branch-meta-row strong {
        text-align: right;
      }
      .branch-card-actions {
        display: flex;
        justify-content: flex-end;
      }
      .btn-branch-edit {
        min-height: 36px;
        padding: 8px 14px;
        border-radius: 12px;
        font-size: 12.5px;
        width: 100%;
      }
      .branch-submit-actions {
        display: flex;
        gap: 8px;
        align-self: end;
      }
      .empty-branches {
        color: #526970;
        font-style: italic;
      }
    `,
  ],
})
export class CompanyManagerComponent implements OnInit {
  @Input() superadmin = false;
  @Output() changed = new EventEmitter<any>();
  companyError = signal('');
  adminError = signal('');
  branchError = signal('');
  adminSubmitted = signal(false);
  companySubmitted = signal(false);
  branchSubmitted = signal(false);
  adminTouched = { name: false, email: false, password: false };
  companyTouched = {
    name: false,
    code: false,
    department: false,
    admin: false,
    branchName: false,
    province: false,
    municipality: false,
  };
  branchTouched = { name: false, code: false, province: false, municipality: false };
  private listVersion = 0;
  companies = signal<any[]>([]);
  branches = signal<any[]>([]);
  candidates = signal<any[]>([]);
  busy = signal(false);
  error = signal('');
  message = signal('');
  selected = '';
  editingBranch = '';
  isValidCode(value: string) {
    return /^[A-Z0-9_-]{2,50}$/.test((value || '').trim().toUpperCase());
  }
  private slugifyCode(raw: string, prefix = 'EMP'): string {
    const clean = (raw || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 42);
    if (!clean) return '';
    return clean.length < 2 ? `${prefix}-${clean}` : clean;
  }
  generateCompanyCode(name: string): string {
    const base = this.slugifyCode(name, 'EMP');
    if (!base) return '';
    const existing = new Set(this.companies().map((r) => (r.code || '').trim().toUpperCase()));
    if (!existing.has(base)) return base;
    let index = 2;
    while (existing.has(`${base}-${index}`)) index++;
    return `${base}-${index}`;
  }
  generateBranchCode(name: string): string {
    const base = this.slugifyCode(name, 'SUC');
    if (!base) return '';
    const existing = new Set(
      this.branches()
        .filter((b) => b.id !== this.editingBranch)
        .map((b) => (b.code || '').trim().toUpperCase()),
    );
    if (!existing.has(base)) return base;
    let index = 2;
    while (existing.has(`${base}-${index}`)) index++;
    return `${base}-${index}`;
  }
  onCompanyNameChange(name: string) {
    this.company.code = this.generateCompanyCode(name);
  }
  onBranchNameChange(name: string) {
    if (!this.editingBranch) {
      this.branch.code = this.generateBranchCode(name);
    }
  }
  isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || '').trim());
  }
  isValidPassword(value: string) {
    const v = value || '';
    return (
      v.length >= 8 &&
      /[A-Z]/.test(v) &&
      /[a-z]/.test(v) &&
      /[0-9]/.test(v) &&
      /[^A-Za-z0-9]/.test(v)
    );
  }
  resetBranch() {
    this.editingBranch = '';
    this.branchError.set('');
    this.branchSubmitted.set(false);
    this.branchTouched = { name: false, code: false, province: false, municipality: false };
    this.branch = { name: '', code: '', address: '', province_code: '', municipality_code: '' };
  }
  editBranch(branch: any) {
    this.editingBranch = branch.id;
    this.branchError.set('');
    this.branchSubmitted.set(false);
    this.branch = {
      name: branch.name,
      code: branch.code,
      address: branch.address || '',
      province_code: branch.province_code || '',
      municipality_code: branch.municipality_code || '',
    };
  }
  readonly locations = BOLIVIA_LOCATIONS;
  private readonly empty = [];
  provinces(department: string) {
    return this.locations.find((d) => d.code === department)?.provinces || this.empty;
  }
  municipalities(department: string, province: string) {
    return (
      this.provinces(department).find((p) => p.code === province)?.municipalities || this.empty
    );
  }
  selectedDepartment() {
    return this.companies().find((c) => c.id === this.selected)?.department_code || '';
  }
  selectedCompanyName() {
    return this.companies().find((c) => c.id === this.selected)?.name || 'Sin empresa asignada';
  }
  departmentName(code: string) {
    return this.locations.find((d) => d.code === code)?.name || 'Sin departamento registrado';
  }
  branchLocation(branch: any) {
    const province = this.provinces(this.selectedDepartment()).find(
      (p) => p.code === branch.province_code,
    );
    const municipality = province?.municipalities.find((m) => m.code === branch.municipality_code);
    return province && municipality
      ? `${province.name} · ${municipality.name} `
      : 'Ubicación pendiente';
  }
  changeDepartment(code: string) {
    this.company.department_code = code;
    this.company.initial_province_code = '';
    this.company.initial_municipality_code = '';
  }
  company = {
    name: '',
    code: '',
    administrator_id: '',
    initial_branch_name: 'Sucursal principal',
    initial_branch_code: 'PRINCIPAL',
    department_code: '',
    initial_province_code: '',
    initial_municipality_code: '',
  };
  admin = { full_name: '', email: '', password: '' };
  branch = { name: '', code: '', address: '', province_code: '', municipality_code: '' };
  private api = environment.apiUrl;
  private auth = inject(AuthService, { optional: true });
  constructor(private http: HttpClient) {
    effect(() => {
      const user = this.auth?.currentUser();
      const rows = this.companies();
      if (!this.superadmin && user && rows.length > 0) {
        const targetId = this.resolveProfileCompanyId(rows);
        if (targetId !== this.selected) {
          this.selected = targetId;
          if (this.selected) this.loadBranches();
          else this.branches.set([]);
        }
      }
    });
  }
  private resolveProfileCompanyId(rows: any[]): string {
    const user = this.auth?.currentUser();
    const configuredId = user?.active_tenant_id || user?.tenant_id || '';
    if (configuredId && rows.some((row) => row.id === configuredId)) return configuredId;
    return rows.length === 1 ? rows[0].id : '';
  }
  ngOnInit() {
    this.load();
  }
  load() {
    const version = ++this.listVersion;
    this.http.get<any[]>(`${this.api}/tenants`).subscribe({
      next: (rows) => {
        if (version !== this.listVersion) return;
        this.companies.set(rows);
        if (!this.superadmin) {
          this.selected = this.resolveProfileCompanyId(rows);
          if (this.selected) this.loadBranches();
          else this.branches.set([]);
        } else if (
          rows.length &&
          (!this.selected || !rows.some((row) => row.id === this.selected))
        ) {
          this.selected = rows[0].id;
          this.loadBranches();
        }
      },
      error: (e) => this.fail(e),
    });
    if (this.superadmin) {
      this.http.get<any[]>(`${this.api}/tenants/administrator-candidates`).subscribe({
        next: (rows) => this.candidates.set(rows),
        error: (e) => this.fail(e),
      });
    }
  }
  fail(e: any) {
    this.busy.set(false);
    this.error.set(
      e?.name === 'TimeoutError'
        ? 'El servidor no respondió a tiempo. No se pudo confirmar la creación. Actualiza la lista antes de reintentar para comprobar si se guardó.'
        : e?.status === 0
          ? 'No se pudo conectar con el servidor. Comprueba la conexión y actualiza la lista antes de reintentar.'
          : Array.isArray(e?.error?.errors)
            ? e.error.errors.map((item: any) => `${item.field}: ${item.message}`).join('. ')
            : typeof e?.error?.detail === 'string'
              ? e.error.detail
              : 'No se pudo guardar. Revisa los datos e intenta otra vez.',
    );
  }
  createAdmin() {
    if (this.busy()) return;
    this.adminSubmitted.set(true);
    this.adminError.set('');
    this.error.set('');
    if (
      this.admin.full_name.trim().length < 2 ||
      !this.isValidEmail(this.admin.email) ||
      !this.isValidPassword(this.admin.password)
    ) {
      this.adminError.set('Completa nombre, correo válido y una contraseña segura.');
      return;
    }
    this.busy.set(true);
    this.http
      .post<any>(`${this.api}/tenants/administrator-candidates`, {
        full_name: this.admin.full_name.trim(),
        email: this.admin.email.trim(),
        password: this.admin.password,
      })
      .pipe(
        timeout(30000),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (a) => {
          this.busy.set(false);
          this.candidates.update((rows) => [...rows, a]);
          this.company.administrator_id = a.id;
          this.admin = { full_name: '', email: '', password: '' };
          this.adminSubmitted.set(false);
          this.adminTouched = { name: false, email: false, password: false };
          this.message.set('Cuenta preparada y seleccionada para crear la empresa.');
        },
        error: (e) => {
          this.fail(e);
          this.adminError.set(this.error());
        },
      });
  }
  createCompany() {
    if (this.busy()) return;
    this.companySubmitted.set(true);
    this.companyError.set('');
    this.message.set('');
    const normalize = (value: string) => value.trim().replace(/\s+/g, ' ');
    if (!this.company.code.trim() && normalize(this.company.name).length >= 2) {
      this.company.code = this.generateCompanyCode(this.company.name);
    }
    const code = this.company.code.trim().toUpperCase();
    const rawBranchCode = (this.company.initial_branch_code || '').trim().toUpperCase();
    const branchCode =
      !rawBranchCode || rawBranchCode === 'PRINCIPAL'
        ? `${code}-PRINCIPAL`.slice(0, 50)
        : rawBranchCode;
    const payload = {
      ...this.company,
      name: normalize(this.company.name),
      code,
      initial_branch_name: normalize(this.company.initial_branch_name),
      initial_branch_code: branchCode,
    };
    if (
      payload.name.length < 2 ||
      payload.name.length > 250 ||
      payload.initial_branch_name.length < 2 ||
      payload.initial_branch_name.length > 250
    ) {
      this.companyError.set(
        'El nombre de empresa y de sucursal debe tener entre 2 y 250 caracteres, sin espacios vacíos.',
      );
      return;
    }
    if (
      !/^[A-Z0-9_-]{2,50}$/.test(payload.code) ||
      !/^[A-Z0-9_-]{2,50}$/.test(payload.initial_branch_code)
    ) {
      this.companyError.set(
        'Los códigos requieren entre 2 y 50 letras, números, guiones o guiones bajos, sin espacios.',
      );
      return;
    }
    if (
      this.companies().some(
        (row) =>
          normalize(row.name || '').toLocaleLowerCase() === payload.name.toLocaleLowerCase() ||
          (row.code || '').trim().toUpperCase() === payload.code,
      )
    ) {
      this.companyError.set('Ya existe una empresa con ese nombre o código.');
      return;
    }
    if (!this.company.name.trim() || !this.company.code.trim() || !this.company.administrator_id) {
      this.companyError.set(
        'Completa nombre, código y administrador responsable. Si no hay cuentas disponibles, prepara una cuenta de administrador primero.',
      );
      return;
    }
    if (
      !this.company.department_code ||
      !this.company.initial_province_code ||
      !this.company.initial_municipality_code
    ) {
      this.companyError.set('Selecciona departamento, provincia y municipio de la lista.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.http
      .post<any>(`${this.api}/tenants`, payload)
      .pipe(
        timeout(30000),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (c) => {
          this.busy.set(false);
          ++this.listVersion;
          this.companies.update((rows) => [c, ...rows.filter((row) => row.id !== c.id)]);
          this.candidates.update((rows) =>
            rows.filter((row) => row.id !== this.company.administrator_id),
          );
          this.selected = c.id;
          this.company = {
            name: '',
            code: '',
            administrator_id: '',
            initial_branch_name: 'Sucursal principal',
            initial_branch_code: 'PRINCIPAL',
            department_code: '',
            initial_province_code: '',
            initial_municipality_code: '',
          };
          this.companySubmitted.set(false);
          this.companyTouched = {
            name: false,
            code: false,
            department: false,
            admin: false,
            branchName: false,
            province: false,
            municipality: false,
          };
          this.message.set('Empresa creada con su administrador y primera sucursal.');
          this.loadBranches();
          this.changed.emit(c);
        },
        error: (e) => {
          this.fail(e);
          this.companyError.set(this.error());
        },
      });
  }
  loadBranches() {
    this.resetBranch();
    this.branches.set([]);
    const selected = this.selected;
    if (!selected) return;
    this.http.get<any[]>(`${this.api}/branches`, { params: { tenant_id: selected } }).subscribe({
      next: (rows) => {
        if (this.selected === selected) this.branches.set(rows);
      },
      error: (e) => this.fail(e),
    });
  }
  createBranch() {
    if (this.busy() || !this.selected) return;
    this.branchSubmitted.set(true);
    this.branchError.set('');
    this.error.set('');
    const cleanName = (this.branch.name || '').trim();
    if (!this.branch.code.trim() && cleanName.length >= 2) {
      this.branch.code = this.generateBranchCode(cleanName);
    }
    const cleanCode = (this.branch.code || '').trim().toUpperCase();
    if (cleanName.length < 2) {
      this.branchError.set('El nombre de la sucursal no puede quedar vacío (mínimo 2 caracteres).');
      return;
    }
    if (!this.isValidCode(cleanCode)) {
      this.branchError.set(
        'El código de la sucursal requiere entre 2 y 50 letras, números, guiones o guiones bajos, sin espacios.',
      );
      return;
    }
    if (!this.branch.province_code || !this.branch.municipality_code) {
      this.branchError.set('Selecciona provincia y municipio de la sucursal.');
      return;
    }
    if (
      this.branches().some(
        (b) =>
          b.id !== this.editingBranch &&
          ((b.code || '').trim().toUpperCase() === cleanCode ||
            (b.name || '').trim().toLocaleLowerCase() === cleanName.toLocaleLowerCase()),
      )
    ) {
      this.branchError.set('Ya existe una sucursal en esta empresa con ese nombre o código.');
      return;
    }
    this.busy.set(true);
    const payload = {
      ...this.branch,
      name: cleanName,
      code: cleanCode,
      tenant_id: this.selected,
    };
    const request = this.editingBranch
      ? this.http.put<any>(`${this.api}/branches/${this.editingBranch}`, payload)
      : this.http.post<any>(`${this.api}/branches`, payload);
    request.subscribe({
      next: (saved) => {
        this.busy.set(false);
        const wasEditing = this.editingBranch;
        if (saved && saved.id) {
          this.branches.update((rows) =>
            wasEditing
              ? rows.map((r) => (r.id === saved.id ? saved : r))
              : [...rows.filter((r) => r.id !== saved.id), saved],
          );
        }
        this.resetBranch();
        this.message.set(wasEditing ? 'Sucursal actualizada.' : 'Sucursal creada.');
        this.loadBranches();
      },
      error: (e) => {
        this.fail(e);
        this.branchError.set(this.error());
      },
    });
  }
}
