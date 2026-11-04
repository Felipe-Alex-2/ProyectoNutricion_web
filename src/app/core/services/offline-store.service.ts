import { Injectable, signal } from '@angular/core';
import { HttpRequest } from '@angular/common/http';
import { TokenService } from './token.service';

export interface PendingOperation {
  id: string;
  scope: string;
  url: string;
  body: any;
  headers: Record<string, string>;
  created: string;
  error?: string;
  blocked?: boolean;
}
interface Envelope {
  iv: Uint8Array;
  data: ArrayBuffer;
}

@Injectable({ providedIn: 'root' })
export class OfflineStore {
  readonly offline = signal(typeof navigator !== 'undefined' && !navigator.onLine);
  readonly pending = signal<PendingOperation[]>([]);
  activeScope = '';
  private database?: Promise<IDBDatabase>;
  private encryptionKey?: Promise<CryptoKey>;
  constructor(private tokens: TokenService) {}

  owner(): string | null {
    try {
      const part = this.tokens.getAccessToken()?.split('.')[1];
      return part ? JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))).sub || null : null;
    } catch {
      return null;
    }
  }
  scope(headers: Record<string, string>): string {
    return JSON.stringify([
      this.owner(),
      headers['X-Workspace-Company'] || '',
      headers['X-Workspace-Branch'] || '',
    ]);
  }
  requestScope(req: HttpRequest<unknown>): string {
    return this.scope({
      'X-Workspace-Company': req.headers.get('X-Workspace-Company') || '',
      'X-Workspace-Branch': req.headers.get('X-Workspace-Branch') || '',
    });
  }
  cacheKey(req: HttpRequest<unknown>): string {
    const url = new URL(req.urlWithParams, location.origin);
    url.searchParams.sort();
    const scope = url.pathname.endsWith('/users/me')
      ? JSON.stringify([this.owner()])
      : this.requestScope(req);
    return `cache:${scope}:${url.toString()}`;
  }
  private db(): Promise<IDBDatabase> {
    return (this.database ??= new Promise((resolve, reject) => {
      const request = indexedDB.open('nutrisalud-offline-v1', 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('data');
        request.result.createObjectStore('keys');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }));
  }
  private key(): Promise<CryptoKey> {
    return (this.encryptionKey ??= (async () => {
      const db = await this.db();
      const generated = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
        'encrypt',
        'decrypt',
      ]);
      return new Promise<CryptoKey>((resolve, reject) => {
        const tx = db.transaction('keys', 'readwrite');
        const store = tx.objectStore('keys');
        const request = store.get('device');
        let key: CryptoKey;
        request.onsuccess = () => {
          key = request.result || generated;
          if (!request.result) store.put(key, 'device');
        };
        tx.oncomplete = () => resolve(key!);
        tx.onerror = () => reject(tx.error);
      });
    })());
  }
  async put(id: string, value: unknown): Promise<void> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.key();
    const data = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(id) },
      key,
      new TextEncoder().encode(JSON.stringify(value)),
    );
    const db = await this.db();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('data', 'readwrite');
      tx.objectStore('data').put({ iv, data }, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
  async get<T>(id: string): Promise<T | null> {
    const db = await this.db();
    const envelope = await new Promise<Envelope | undefined>((resolve, reject) => {
      const request = db.transaction('data').objectStore('data').get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (!envelope) return null;
    const plain = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: envelope.iv as Uint8Array<ArrayBuffer>,
        additionalData: new TextEncoder().encode(id),
      },
      await this.key(),
      envelope.data,
    );
    return JSON.parse(new TextDecoder().decode(plain));
  }
  async remove(id: string): Promise<void> {
    const db = await this.db();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('data', 'readwrite');
      tx.objectStore('data').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  async list(scope: string): Promise<PendingOperation[]> {
    const db = await this.db();
    const prefix = `queue:${scope}:`;
    const ids = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const request = db
        .transaction('data')
        .objectStore('data')
        .getAllKeys(IDBKeyRange.bound(prefix, prefix + '\uffff'));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const entries = await Promise.all(ids.map((id) => this.get<PendingOperation>(String(id))));
    return entries
      .filter((x): x is PendingOperation => !!x)
      .sort((a, b) => a.created.localeCompare(b.created));
  }
  async reload(scope: string): Promise<void> {
    const entries = await this.list(scope);
    if (scope === this.activeScope) this.pending.set(entries);
  }
  async enqueue(req: HttpRequest<any>): Promise<any> {
    const owner = this.owner();
    if (!owner) throw new Error('Inicia sesión antes de guardar operaciones pendientes.');
    const scope = this.requestScope(req);
    if ((await this.list(scope)).length >= 200)
      throw new Error('Sincroniza las operaciones pendientes antes de añadir más.');
    const headers: Record<string, string> = {};
    for (const name of ['X-Workspace-Company', 'X-Workspace-Branch']) {
      const value = req.headers.get(name);
      if (value) headers[name] = value;
    }
    const operation: PendingOperation = {
      id: req.headers.get('Idempotency-Key') || crypto.randomUUID(),
      scope,
      url: req.urlWithParams,
      body: req.body,
      headers,
      created: new Date().toISOString(),
    };
    await this.put(`queue:${scope}:${operation.id}`, operation);
    if (owner !== this.owner() || (this.activeScope && scope !== this.activeScope))
      throw new Error('La cuenta o sucursal cambió durante el guardado.');
    await this.reload(scope);
    return req.url.endsWith('/recipes')
      ? {
          ...req.body,
          id: `offline-${operation.id}`,
          created_by: owner,
          is_active: true,
          created_at: operation.created,
          updated_at: operation.created,
          offline_pending: true,
        }
      : {
          ...req.body,
          payment_id: operation.id,
          currency: req.body.currency || 'USD',
          approval_url: null,
          paypal_order_id: null,
          offline_pending: true,
        };
  }
}
