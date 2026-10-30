import { Component, Input, OnInit, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
@Component({
  selector: 'app-company-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: ` <section class="company-panel">
    <h2>{{ superadmin ? 'Empresas y sucursales' : 'Sucursales de tu empresa' }}</h2>
    <p>Cada empresa mantiene separados sus pacientes, cobros, planes y reportes.</p>
    @if (error()) {
      <p role="alert">{{ error() }}</p>
    }
    @if (message()) {
      <p role="status">{{ message() }}</p>
    }
    @if (superadmin) {
      <details>
        <summary>Preparar cuenta de administrador</summary>
        <form (ngSubmit)="createAdmin()">
          <label
            >Nombre<input
              name="adminName"
              [(ngModel)]="admin.full_name"
              required
              minlength="2" /></label
          ><label
            >Correo<input
              name="adminEmail"
              [(ngModel)]="admin.email"
              type="email"
              required /></label
          ><label
            >Contraseña inicial<input
              name="adminPassword"
              [(ngModel)]="admin.password"
              type="password"
              autocomplete="new-password"
              required
              minlength="8"
          /></label>
          <p>La contraseña requiere mayúscula, minúscula, número y símbolo.</p>
          <button [disabled]="busy()">Crear cuenta de administrador</button>
        </form>
      </details>
      <details>
        <summary>Crear empresa</summary>
        <form (ngSubmit)="createCompany()">
          <label
            >Nombre de la empresa<input
              name="name"
              [(ngModel)]="company.name"
              required
              minlength="2"
          /></label>
          <label
            >Código único<input name="code" [(ngModel)]="company.code" required minlength="2"
          /></label>
          <label
            >Administrador responsable<select
              name="administrator"
              [(ngModel)]="company.administrator_id"
              required
            >
              <option value="">Selecciona una cuenta disponible</option>
              @for (a of candidates(); track a.id) {
                <option [value]="a.id">{{ a.full_name }} · {{ a.email }}</option>
              }
            </select></label
          >
          <label
            >Primera sucursal<input
              name="initialBranch"
              [(ngModel)]="company.initial_branch_name"
              required
              minlength="2"
          /></label>
          <button [disabled]="busy()">Crear empresa y asignar administrador</button>
        </form>
      </details>
    }
    <label
      >Empresa<select
        name="selectedCompany"
        [(ngModel)]="selected"
        (ngModelChange)="loadBranches()"
      >
        <option value="">Selecciona una empresa</option>
        @for (c of companies(); track c.id) {
          <option [value]="c.id">{{ c.name }}</option>
        }
      </select></label
    >
    @if (selected) {
      <ul>
        @for (b of branches(); track b.id) {
          <li>
            <strong>{{ b.name }}</strong> · {{ b.code }}
            @if (b.address) {
              · {{ b.address }}
            }
          </li>
        } @empty {
          <li>Sin sucursales registradas.</li>
        }
      </ul>
      <form (ngSubmit)="createBranch()">
        <h3>Nueva sucursal</h3>
        <label
          >Nombre<input name="branchName" [(ngModel)]="branch.name" required minlength="2" /></label
        ><label
          >Código<input name="branchCode" [(ngModel)]="branch.code" required minlength="2" /></label
        ><label>Dirección<input name="branchAddress" [(ngModel)]="branch.address" /></label
        ><button [disabled]="busy()">Crear sucursal</button>
      </form>
    }
  </section>`,
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
      form {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: 16px;
        margin: 20px 0;
      }
      label {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin: 12px 0;
      }
      input,
      select {
        font: inherit;
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
      }
      button:disabled {
        opacity: 0.5;
        cursor: wait;
      }
      summary {
        cursor: pointer;
        padding: 16px 0;
        font-weight: 600;
      }
      details {
        border-bottom: 1px solid var(--color-border, #ccdede);
      }
      li {
        padding: 10px 0;
      }
    `,
  ],
})
export class CompanyManagerComponent implements OnInit {
  @Input() superadmin = false;
  @Output() changed = new EventEmitter<void>();
  companies = signal<any[]>([]);
  branches = signal<any[]>([]);
  candidates = signal<any[]>([]);
  busy = signal(false);
  error = signal('');
  message = signal('');
  selected = '';
  company = {
    name: '',
    code: '',
    administrator_id: '',
    initial_branch_name: 'Sucursal principal',
    initial_branch_code: 'PRINCIPAL',
  };
  admin = { full_name: '', email: '', password: '' };
  branch = { name: '', code: '', address: '' };
  private api = environment.apiUrl;
  constructor(private http: HttpClient) {}
  ngOnInit() {
    this.load();
  }
  load() {
    this.http.get<any[]>(`${this.api}/tenants`).subscribe({
      next: (rows) => {
        this.companies.set(rows);
        if (rows.length === 1) {
          this.selected = rows[0].id;
          this.loadBranches();
        }
      },
      error: (e) => this.fail(e),
    });
    if (this.superadmin)
      this.http
        .get<any[]>(`${this.api}/tenants/administrator-candidates`)
        .subscribe({ next: (rows) => this.candidates.set(rows), error: (e) => this.fail(e) });
  }
  fail(e: any) {
    this.busy.set(false);
    this.error.set(
      typeof e?.error?.detail === 'string'
        ? e.error.detail
        : 'No se pudo guardar. Revisa los datos e intenta otra vez.',
    );
  }
  createAdmin() {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.http.post<any>(`${this.api}/tenants/administrator-candidates`, this.admin).subscribe({
      next: (a) => {
        this.busy.set(false);
        this.candidates.update((rows) => [...rows, a]);
        this.company.administrator_id = a.id;
        this.admin = { full_name: '', email: '', password: '' };
        this.message.set('Cuenta preparada. Selecciónala al crear la empresa.');
      },
      error: (e) => this.fail(e),
    });
  }
  createCompany() {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.http.post<any>(`${this.api}/tenants`, this.company).subscribe({
      next: (c) => {
        this.busy.set(false);
        this.selected = c.id;
        this.company = {
          name: '',
          code: '',
          administrator_id: '',
          initial_branch_name: 'Sucursal principal',
          initial_branch_code: 'PRINCIPAL',
        };
        this.message.set('Empresa creada con su administrador y primera sucursal.');
        this.load();
        this.loadBranches();
        this.changed.emit();
      },
      error: (e) => this.fail(e),
    });
  }
  loadBranches() {
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
    this.busy.set(true);
    this.error.set('');
    this.http.post(`${this.api}/branches`, { ...this.branch, tenant_id: this.selected }).subscribe({
      next: () => {
        this.busy.set(false);
        this.branch = { name: '', code: '', address: '' };
        this.message.set('Sucursal creada.');
        this.loadBranches();
      },
      error: (e) => this.fail(e),
    });
  }
}
