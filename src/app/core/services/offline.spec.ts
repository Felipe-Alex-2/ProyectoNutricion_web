/// <reference types="node" />
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { webcrypto } from 'node:crypto';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from './auth.service';
import { WorkspaceContextService } from './workspace-context.service';
import { OfflineService } from './offline.service';
import {
  HttpClient,
  HttpHeaders,
  HttpRequest,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { OfflineStore } from './offline-store.service';
import { TokenService } from './token.service';
import { offlineInterceptor } from '../interceptors/offline.interceptor';
import { environment } from '../../../environments/environment';

describe('Offline storage and replay boundaries', () => {
  let store: OfflineStore;
  let tokens: TokenService;
  let http: HttpClient;
  let backend: HttpTestingController;
  const scopeHeaders = { 'X-Workspace-Company': 'a', 'X-Workspace-Branch': 'a1' };
  function account(id: string) {
    tokens.saveTokens(`a.${btoa(JSON.stringify({ sub: id }))}.b`, 'refresh');
    store.activeScope = store.scope(scopeHeaders);
  }
  beforeEach(() => {
    Object.defineProperty(globalThis, 'indexedDB', { value: new IDBFactory(), configurable: true });
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([offlineInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { currentUser: signal<any>(null) } },
      ],
    });
    store = TestBed.inject(OfflineStore);
    tokens = TestBed.inject(TokenService);
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    account('user-a');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    backend.verify();
    localStorage.clear();
  });

  it('encrypts records and restores queued operations with the same key after restart', async () => {
    const req = new HttpRequest(
      'POST',
      environment.apiUrl + '/payments/create',
      { payment_method: 'EFECTIVO', amount: 5, customer_name: 'Cliente' },
      { headers: new HttpHeaders({ ...scopeHeaders, 'Idempotency-Key': 'stable-cash' }) },
    );
    const result = await store.enqueue(req);
    expect(result.offline_pending).toBe(true);
    const restarted = new OfflineStore(tokens);
    const pending = await restarted.list(store.scope(scopeHeaders));
    expect(pending[0].id).toBe('stable-cash');
    expect(pending[0].body.amount).toBe(5);
    const database = await new Promise<IDBDatabase>((resolve) => {
      const open = indexedDB.open('nutrisalud-offline-v1');
      open.onsuccess = () => resolve(open.result);
    });
    const raw: any = await new Promise((resolve) => {
      const read = database
        .transaction('data')
        .objectStore('data')
        .get(`queue:${pending[0].scope}:stable-cash`);
      read.onsuccess = () => resolve(read.result);
    });
    expect(raw.body).toBeUndefined();
    expect(raw.iv).toHaveLength(12);
    expect(raw.data.byteLength).toBeGreaterThan(0);
    account('user-b');
    expect(await restarted.list(store.scope(scopeHeaders))).toEqual([]);
  });

  it('separates cached clinical data by account and branch, with a stable profile key', () => {
    const req = new HttpRequest('GET', environment.apiUrl + '/clinical/patients/p/records', {
      headers: new HttpHeaders(scopeHeaders),
    });
    const first = store.cacheKey(req);
    const branch = store.cacheKey(req.clone({ setHeaders: { 'X-Workspace-Branch': 'a2' } }));
    expect(branch).not.toBe(first);
    account('user-b');
    expect(store.cacheKey(req)).not.toBe(first);
    const profile = new HttpRequest('GET', environment.apiUrl + '/users/me');
    expect(store.cacheKey(profile)).toBe(
      store.cacheKey(profile.clone({ setHeaders: scopeHeaders })),
    );
  });

  it('preserves a lost cash response as pending with the original idempotency key', async () => {
    store.offline.set(false);
    const result = firstValueFrom(
      http.post<any>(
        environment.apiUrl + '/payments/create',
        { payment_method: 'EFECTIVO', amount: 5, customer_name: 'Cliente' },
        { headers: scopeHeaders },
      ),
    );
    const request = backend.expectOne(environment.apiUrl + '/payments/create');
    const id = request.request.headers.get('Idempotency-Key');
    request.error(new ProgressEvent('error'));
    expect((await result).offline_pending).toBe(true);
    expect(store.pending()[0].id).toBe(id);
  });

  it('never queues PayPal and never substitutes cached data for a forbidden response', async () => {
    store.offline.set(true);
    await expect(
      firstValueFrom(
        http.post(
          environment.apiUrl + '/payments/create',
          { payment_method: 'PAYPAL', amount: 5 },
          { headers: scopeHeaders },
        ),
      ),
    ).rejects.toMatchObject({ status: 0 });
    expect(store.pending()).toEqual([]);
    store.offline.set(false);
    const url = environment.apiUrl + '/clinical/patients/p/records';
    const req = new HttpRequest('GET', url, { headers: new HttpHeaders(scopeHeaders) });
    await store.put(store.cacheKey(req), { date: Date.now(), body: [{ id: 'old' }] });
    const result = firstValueFrom(http.get(url, { headers: scopeHeaders }));
    const rejection = expect(result).rejects.toMatchObject({ status: 403 });
    backend
      .expectOne(url)
      .flush({ detail: 'Acceso denegado' }, { status: 403, statusText: 'Forbidden' });
    await rejection;
  });

  it('downloads evaluations at login and starts a new copy every hour while open', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    TestBed.inject(WorkspaceContextService).headers.set(scopeHeaders);
    (TestBed.inject(AuthService).currentUser as any).set({
      id: 'user-a',
      role_id: 'NUTRICIONISTA',
    });
    const offline = TestBed.inject(OfflineService);
    TestBed.tick();
    const visited: string[] = [];
    for (let i = 0; i < 250 && !offline.lastCopy(); i++) {
      await new Promise((resolve) => setTimeout(resolve, 5));
      for (const request of backend.match(() => true)) {
        visited.push(request.request.urlWithParams);
        const url = request.request.url;
        request.flush(
          url.endsWith('/users/me')
            ? { id: 'user-a' }
            : url.includes('/users/patients')
              ? [{ id: 'patient-1', full_name: 'Paciente', is_active: true }]
              : [],
        );
      }
    }
    expect(offline.lastCopy()).not.toBeNull();
    expect(visited.some((url) => url.endsWith('/clinical/patients/patient-1/records'))).toBe(true);
    expect(visited.some((url) => url.endsWith('/plans/patient/patient-1'))).toBe(true);
    const last = offline.lastCopy();
    await vi.advanceTimersByTimeAsync(3600000);
    backend
      .expectOne(environment.apiUrl + '/users/me')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(offline.lastCopy()).toBe(last);
    expect(offline.message()).toContain('incompleta');
  });

  it('keeps a rejected operation visible and removes only a confirmed replay', async () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    TestBed.inject(WorkspaceContextService).headers.set(scopeHeaders);
    (TestBed.inject(AuthService).currentUser as any).set({
      id: 'user-a',
      role_id: 'NUTRICIONISTA',
    });
    const offline = TestBed.inject(OfflineService);
    TestBed.tick();
    await new Promise((resolve) => setTimeout(resolve, 30));
    const url = environment.apiUrl + '/recipes';
    await store.enqueue(
      new HttpRequest(
        'POST',
        url,
        { title: 'Receta pendiente' },
        { headers: new HttpHeaders({ ...scopeHeaders, 'Idempotency-Key': 'recipe-stable' }) },
      ),
    );
    online.mockReturnValue(true);
    const sync = offline.sync();
    let sent = false;
    for (let i = 0; i < 100 && !sent; i++) {
      await new Promise((resolve) => setTimeout(resolve, 5));
      for (const request of backend.match(url)) {
        expect(request.request.headers.get('Idempotency-Key')).toBe('recipe-stable');
        request.flush({ detail: 'Título ya existente' }, { status: 409, statusText: 'Conflict' });
        sent = true;
      }
    }
    await sync;
    expect(store.pending()[0].blocked).toBe(true);
    expect(store.pending()[0].error).toContain('Título');
    const retry = offline.retry(store.pending()[0]);
    sent = false;
    for (let i = 0; i < 100 && !sent; i++) {
      await new Promise((resolve) => setTimeout(resolve, 5));
      for (const request of backend.match(url)) {
        expect(request.request.headers.get('Idempotency-Key')).toBe('recipe-stable');
        request.flush({ id: 'server-recipe' });
        sent = true;
      }
    }
    await retry;
    expect(store.pending()).toEqual([]);
    expect(offline.revision()).toBe(1);
  });

  it('restores full pending recipes in the offline catalog after a reload', async () => {
    const url = environment.apiUrl + '/recipes';
    await store.put(
      store.cacheKey(new HttpRequest('GET', url, { headers: new HttpHeaders(scopeHeaders) })),
      { date: Date.now(), body: [] },
    );
    await store.enqueue(
      new HttpRequest(
        'POST',
        url,
        {
          title: 'Receta sin internet',
          ingredients: 'Arroz y verduras',
          instructions: 'Cocinar y servir.',
        },
        { headers: new HttpHeaders({ ...scopeHeaders, 'Idempotency-Key': 'draft' }) },
      ),
    );
    store.offline.set(true);
    const catalog = await firstValueFrom(http.get<any[]>(url, { headers: scopeHeaders }));
    expect(catalog[0].offline_pending).toBe(true);
    expect(catalog[0].ingredients).toBe('Arroz y verduras');
  });
});
