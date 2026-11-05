import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, timeout, TimeoutError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { WorkspaceContextService } from './workspace-context.service';
import { OfflineStore, PendingOperation } from './offline-store.service';

@Injectable({ providedIn: 'root' })
export class OfflineService {
  readonly store = inject(OfflineStore);
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private workspace = inject(WorkspaceContextService);
  readonly copying = signal(false);
  readonly syncing = signal(false);
  readonly lastCopy = signal<string | null>(null);
  readonly message = signal('');
  readonly revision = signal(0);
  private activeScope = '';
  private generation = 0;
  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      const headers = this.workspace.headers();
      const scope = user && user.role_id !== 'CLIENTE' ? this.store.scope(headers) : '';
      if (scope === this.activeScope) return;
      this.activeScope = scope;
      this.store.activeScope = scope;
      const version = ++this.generation;
      this.lastCopy.set(null);
      this.store.pending.set([]);
      this.message.set('');
      this.copying.set(false);
      clearInterval(this.timer);
      if (!scope) return;
      void this.initialize(scope, version);
      this.timer = setInterval(() => {
        void this.copy();
      }, 3600000);
    });
    const onOffline = () => this.store.offline.set(true);
    const onOnline = () => {
      void this.reconnect();
    };
    const onVisibility = () => {
      const last = this.lastCopy();
      if (
        !document.hidden &&
        navigator.onLine &&
        (!last || Date.now() - Date.parse(last) >= 3600000)
      )
        void this.reconnect();
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibility);
    // Retry temporary server failures while the application is open.
    const retryTimer = setInterval(() => {
      if (navigator.onLine && this.activeScope && !this.copying()) {
        if (this.store.offline()) void this.reconnect();
        else void this.sync();
      }
    }, 30000);
    inject(DestroyRef).onDestroy(() => {
      ++this.generation;
      clearInterval(this.timer);
      clearInterval(retryTimer);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibility);
    });
  }
  private async initialize(scope: string, version: number) {
    try {
      const saved = await this.store.get<string>(`last-copy:${scope}`);
      if (version !== this.generation) return;
      this.lastCopy.set(saved);
      await this.store.reload(scope);
      if (version === this.generation && navigator.onLine) await this.reconnect();
    } catch {
      if (version === this.generation)
        this.message.set('No se pudo abrir el almacenamiento local del navegador.');
    }
  }
  private async reconnect() {
    await this.sync();
    await this.copy();
  }

  async copy(): Promise<void> {
    const scope = this.activeScope;
    const version = this.generation;
    if (!scope || this.copying()) return;
    if (!navigator.onLine) {
      this.message.set('Necesitas internet para actualizar la copia.');
      return;
    }
    this.copying.set(true);
    this.message.set('');
    const headers = { ...this.workspace.headers(), 'X-Offline-Copy': '1' };
    const get = async (path: string) => {
      if (version !== this.generation || scope !== this.store.scope(this.workspace.headers()))
        throw new Error('Cuenta cambiada');
      return firstValueFrom(
        this.http.get<any>(environment.apiUrl + path, { headers }).pipe(timeout(20000)),
      );
    };
    try {
      await get('/users/me');
      await get('/recipes');
      const tenants = await get('/tenants?active_only=false');
      await get('/branches');
      for (const tenant of tenants) {
        await get(`/branches?tenant_id=${encodeURIComponent(tenant.id)}`);
        await get(`/payments/stats?tenant_id=${encodeURIComponent(tenant.id)}`);
      }
      await get('/payments');
      await get('/payments/stats');
      await get('/appointments');
      const patients: any[] = [];
      for (let offset = 0; ; offset += 50) {
        const page = await get(`/users/patients?limit=50&offset=${offset}`);
        patients.push(...page);
        if (page.length < 50) break;
      }
      await this.store.put(`patients:${scope}`, { date: Date.now(), body: patients });
      for (const patient of patients) {
        for (const suffix of ['anamnesis', 'records', 'ai-recommendations']) {
          try {
            await get(`/clinical/patients/${patient.id}/${suffix}`);
          } catch (error) {
            // A missing evaluation is valid; a failed download isn't a complete copy.
            if (!(error instanceof HttpErrorResponse) || error.status !== 404) throw error;
          }
        }
        await get(`/plans/patient/${patient.id}`);
        await get(`/food/history?patient_id=${patient.id}`);
      }
      if (version !== this.generation) return;
      const date = new Date().toISOString();
      await this.store.put(`last-copy:${scope}`, date);
      if (version === this.generation) this.lastCopy.set(date);
    } catch (error) {
      if (
        version === this.generation &&
        (error instanceof TimeoutError ||
          (error instanceof HttpErrorResponse && error.status === 0))
      )
        this.store.offline.set(true);
      if (version === this.generation)
        this.message.set(
          'Copia incompleta. Se conserva lo descargado. Reintenta cuando vuelva la conexión.',
        );
    } finally {
      if (version === this.generation) this.copying.set(false);
    }
  }

  async sync(): Promise<void> {
    const scope = this.activeScope;
    const version = this.generation;
    if (!scope || this.syncing() || !navigator.onLine) return;
    this.syncing.set(true);
    try {
      // Cross-tab lock avoids two open tabs replaying the same operation concurrently.
      const run = async () => {
        const entries = await this.store.list(scope);
        for (const entry of entries) {
          if (version !== this.generation || this.store.scope(this.workspace.headers()) !== scope)
            break;
          if (entry.blocked) continue;
          try {
            await firstValueFrom(
              this.http
                .post(entry.url, entry.body, {
                  headers: {
                    ...entry.headers,
                    'X-Offline-Replay': '1',
                    'Idempotency-Key': entry.id,
                  },
                })
                .pipe(timeout(25000)),
            );
            await this.store.remove(`queue:${scope}:${entry.id}`);
            if (version === this.generation) this.revision.update((x) => x + 1);
          } catch (error) {
            const status = error instanceof HttpErrorResponse ? error.status : 0;
            if (status === 0 && version === this.generation) this.store.offline.set(true);
            if (status === 401 || status === 0) break;
            entry.error =
              error instanceof HttpErrorResponse
                ? error.error?.detail || 'No se pudo sincronizar. Revisa los datos.'
                : 'Error de sincronización';
            entry.blocked = status >= 400 && status < 500 && status !== 429;
            await this.store.put(`queue:${scope}:${entry.id}`, entry);
            if (!entry.blocked) break;
          }
        }
      };
      if (navigator.locks) await navigator.locks.request(`nutrisalud-sync:${scope}`, run);
      else await run();
      if (version === this.generation) await this.store.reload(scope);
    } catch {
      if (version === this.generation)
        this.message.set('No se pudo sincronizar. Tus pendientes se conservan en este navegador.');
    } finally {
      this.syncing.set(false);
    }
  }
  async retry(entry: PendingOperation) {
    if (entry.scope !== this.activeScope) return;
    await this.store.put(`queue:${entry.scope}:${entry.id}`, {
      ...entry,
      blocked: false,
      error: undefined,
    });
    await this.store.reload(entry.scope);
    await this.sync();
  }
  async discard(entry: PendingOperation) {
    if (entry.scope !== this.activeScope || !confirm('¿Descartar esta operación local pendiente?'))
      return;
    await this.store.remove(`queue:${entry.scope}:${entry.id}`);
    await this.store.reload(entry.scope);
  }
}
