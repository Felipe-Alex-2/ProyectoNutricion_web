import { inject } from '@angular/core';
import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpResponse,
  HttpParams,
} from '@angular/common/http';
import { catchError, from, mergeMap, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OfflineStore } from '../services/offline-store.service';

export const offlineInterceptor: HttpInterceptorFn = (original, next) => {
  const store = inject(OfflineStore);
  if (!original.url.startsWith(environment.apiUrl + '/') || !store.owner()) return next(original);
  const path = original.url.slice(environment.apiUrl.length).split('?')[0];
  const readable =
    original.method === 'GET' &&
    original.responseType === 'json' &&
    /^\/(users\/me$|users\/patients|clinical\/|plans\/|recipes|payments|appointments|tenants|branches)/.test(
      path,
    );
  const queueable =
    original.method === 'POST' &&
    (path === '/recipes' ||
      (path === '/payments/create' && (original.body as any)?.payment_method === 'EFECTIVO'));
  const req = original.clone({
    setHeaders: {
      'ngsw-bypass': 'true',
      ...(queueable && !original.headers.has('Idempotency-Key')
        ? { 'Idempotency-Key': crypto.randomUUID() }
        : {}),
    },
  });
  const owner = store.owner();
  const replay = req.headers.has('X-Offline-Replay');
  const snapshot = req.headers.has('X-Offline-Copy');
  const cacheKey = store.cacheKey(req);
  const cachedResponse = async (body: any) => {
    if (path === '/recipes' && Array.isArray(body)) {
      const query = new URL(req.urlWithParams, location.origin).searchParams;
      const entries = await store.list(store.requestScope(req));
      const recipes = entries
        .filter(
          (entry) =>
            entry.url.endsWith('/recipes') &&
            ['tenant_id', 'category', 'difficulty'].every(
              (key) => !query.has(key) || String(entry.body[key]) === query.get(key),
            ),
        )
        .map((entry) => ({
          ...entry.body,
          id: `offline-${entry.id}`,
          created_by: owner,
          is_active: true,
          created_at: entry.created,
          updated_at: entry.created,
          offline_pending: true,
        }));
      body = [...recipes, ...body];
    }
    if (owner !== store.owner()) throw new HttpErrorResponse({ status: 401 });
    return new HttpResponse({ body });
  };
  const local = async () => {
    if (owner !== store.owner()) throw new HttpErrorResponse({ status: 401 });
    if (queueable && !replay && !snapshot)
      return new HttpResponse({ body: await store.enqueue(req) });
    if (readable && !snapshot) {
      const query = new URL(req.urlWithParams, location.origin).searchParams;
      if (path === '/users/patients') {
        const collection = await store.get<{ date: number; body: any[] }>(
          `patients:${store.requestScope(req)}`,
        );
        if (collection && owner === store.owner() && Date.now() - collection.date < 30 * 86400000) {
          const search = (query.get('search') || '').toLocaleLowerCase();
          const offset = Number(query.get('offset') || 0),
            limit = Number(query.get('limit') || 50);
          const filtered = collection.body.filter(
            (row) =>
              (!query.has('tenant_id') || row.tenant_id === query.get('tenant_id')) &&
              (!query.has('is_active') || String(row.is_active) === query.get('is_active')) &&
              (!search ||
                [row.full_name, row.email, row.phone].some((value) =>
                  String(value || '')
                    .toLocaleLowerCase()
                    .includes(search),
                )),
          );
          return new HttpResponse({ body: filtered.slice(offset, offset + limit) });
        }
      }
      const saved = await store.get<{ date: number; body: unknown }>(cacheKey);
      if (owner !== store.owner()) throw new HttpErrorResponse({ status: 401 });
      if (saved && Date.now() - saved.date < 30 * 86400000) return cachedResponse(saved.body);
      if (
        [
          '/recipes',
          '/payments',
          '/payments/stats',
          '/tenants',
          '/branches',
          '/appointments',
        ].includes(path)
      ) {
        const base = req.clone({ url: environment.apiUrl + path, params: new HttpParams() });
        const collection = await store.get<{ date: number; body: any }>(store.cacheKey(base));
        if (
          collection &&
          owner === store.owner() &&
          Date.now() - collection.date < 30 * 86400000 &&
          Array.isArray(collection.body)
        ) {
          const filtered = collection.body.filter((row: any) =>
            ['tenant_id', 'category', 'difficulty', 'status'].every(
              (key) =>
                !query.has(key) ||
                query.get(key) === 'EFECTIVO' ||
                String(row[key]) === query.get(key),
            ),
          );
          return cachedResponse(filtered);
        }
      }
    }
    throw new HttpErrorResponse({
      status: 0,
      error: {
        detail: 'Sin conexión. Esta información todavía no está descargada o requiere internet.',
      },
    });
  };
  if (store.offline() && !replay && !snapshot) return from(local());
  return next(req).pipe(
    mergeMap((event) => {
      if (event instanceof HttpResponse && readable && owner === store.owner()) {
        store.offline.set(false);
        return from(store.put(cacheKey, { date: Date.now(), body: event.body })).pipe(
          // A storage failure must not turn an already successful request into a retry.
          catchError(() => of(undefined)),
          mergeMap(() => of(event)),
        );
      }
      return of(event);
    }),
    catchError((error) => {
      if (readable && error instanceof HttpErrorResponse && [403, 404].includes(error.status)) {
        return from(store.remove(cacheKey)).pipe(
          catchError(() => of(undefined)),
          mergeMap(() => throwError(() => error)),
        );
      }
      if (error instanceof HttpErrorResponse && error.status === 0 && !replay && !snapshot) {
        store.offline.set(true);
        return from(local());
      }
      return throwError(() => error);
    }),
  );
};
