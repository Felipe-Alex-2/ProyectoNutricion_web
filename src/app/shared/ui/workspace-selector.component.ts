import {
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-workspace-selector',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section aria-label="Espacio de trabajo" class="workspace-selector" [class.compact]="compact">
      @if (!compact) {
        <h3>Tu espacio de trabajo</h3>
        <p>Las consultas y operaciones usarán la empresa y sucursal seleccionadas.</p>
      }
      @if (error()) {
        <p role="alert">{{ error() }}</p>
      }
      @if (loading()) {
        <p role="status">Cargando empresas y sucursales…</p>
      } @else {
        @if (isRoot()) {
          <label
            >Empresa
            <select [(ngModel)]="company" (ngModelChange)="branch = ''" [disabled]="busy()">
              <option value="">Todas las empresas · vista global</option>
              @for (item of companies(); track item.id) {
                <option [value]="item.id">{{ item.name }}</option>
              }
            </select>
          </label>
        } @else {
          <p><strong>Empresa:</strong> {{ companyName() }}</p>
        }
        @if (company) {
          <label
            >Sucursal
            <select [(ngModel)]="branch" [disabled]="busy()">
              <option value="">
                {{
                  isRoot() ? 'Todas las sucursales · vista de empresa' : 'Selecciona una sucursal'
                }}
              </option>
              @for (item of companyBranches(); track item.id) {
                <option [value]="item.id">{{ item.name }}</option>
              }
            </select>
          </label>
        }
        <button
          type="button"
          class="ns-btn ns-btn-primary"
          (click)="save()"
          [disabled]="busy() || (!isRoot() && (!company || !branch))"
        >
          {{ busy() ? 'Aplicando…' : 'Usar este espacio' }}
        </button>
      }
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .workspace-selector {
        padding: 18px;
        border: 1px solid var(--border-color, #ccdede);
        border-radius: 18px;
        margin: 16px 0;
      }
      h3 {
        margin: 0 0 10px;
      }
      p {
        line-height: 1.5;
      }
      label {
        display: grid;
        gap: 8px;
        margin: 14px 0;
      }
      select {
        width: 100%;
        min-height: 44px;
        border: 1px solid var(--border-color, #ccdede);
        border-radius: 12px;
        padding: 10px;
        font: inherit;
        background: var(--bg-card, #fff);
        color: var(--text-primary, #12343b);
      }
      select:focus-visible {
        outline: 2px solid var(--color-primary, #087f77);
        outline-offset: 2px;
      }
      .compact {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
        gap: 16px;
        align-items: end;
      }
      .compact label,
      .compact p {
        margin: 0;
      }
    `,
  ],
})
export class WorkspaceSelectorComponent implements OnInit {
  @Input() compact = false;
  readonly auth = inject(AuthService);
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);
  @Output() saved = new EventEmitter<void>();
  readonly companies = signal<{ id: string; name: string }[]>([]);
  readonly branches = signal<{ id: string; name: string; tenant_id: string }[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  company = '';
  branch = '';
  isRoot() {
    return this.auth.currentUser()?.role_id === 'SUPERADMIN';
  }
  companyBranches() {
    return this.branches().filter((b) => b.tenant_id === this.company);
  }
  companyName() {
    return this.companies().find((c) => c.id === this.company)?.name || 'Sin empresa asignada';
  }
  ngOnInit() {
    this.http
      .get<{
        companies: { id: string; name: string }[];
        branches: { id: string; name: string; tenant_id: string }[];
      }>(`${environment.apiUrl}/users/me/workspace-options`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.companies.set(data.companies || []);
          this.branches.set(data.branches || []);
          const user = this.auth.currentUser();
          this.company = user?.active_tenant_id || (this.isRoot() ? '' : user?.tenant_id) || '';
          this.branch = user?.active_branch_id || (this.isRoot() ? '' : user?.branch_id) || '';
          if (!this.companyBranches().some((b) => b.id === this.branch)) this.branch = '';
          if (!this.isRoot() && !this.branch && this.companyBranches().length === 1)
            this.branch = this.companyBranches()[0].id;
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set(
            'No se pudieron cargar los espacios. Vuelve a abrir esta pantalla para reintentar.',
          );
        },
      });
  }
  save() {
    if (this.busy() || (!this.isRoot() && (!this.company || !this.branch))) return;
    this.busy.set(true);
    this.error.set('');
    this.auth
      .updateWorkspace({
        tenant_id: this.company || null,
        branch_id: this.company ? this.branch || null : null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.saved.emit();
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(
            typeof e?.error?.detail === 'string'
              ? e.error.detail
              : 'No se pudo cambiar el espacio de trabajo.',
          );
        },
      });
  }
}
