import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { TokenService } from '../services/token.service';
import { environment } from '../../../environments/environment';
import { WorkspaceContextService } from '../services/workspace-context.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let tokens: TokenService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    tokens = TestBed.inject(TokenService);
    tokens.saveTokens('old', 'refresh');
  });
  afterEach(() => {
    backend.verify();
    tokens.clearTokens();
  });

  it('does not send tokens to third parties', () => {
    http.get('https://example.com/file').subscribe();
    const req = backend.expectOne('https://example.com/file');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('keeps the original branch when refreshing a request started before a workspace change', () => {
    const context = TestBed.inject(WorkspaceContextService);
    context.headers.set({ 'X-Workspace-Company': 'a', 'X-Workspace-Branch': 'a1' });
    http.get(`${environment.apiUrl}/recipes`).subscribe();
    const first = backend.expectOne(`${environment.apiUrl}/recipes`);
    expect(first.request.headers.get('X-Workspace-Branch')).toBe('a1');
    context.headers.set({ 'X-Workspace-Company': 'a', 'X-Workspace-Branch': 'a2' });
    first.flush({}, { status: 401, statusText: 'Unauthorized' });
    backend
      .expectOne(`${environment.apiUrl}/auth/refresh`)
      .flush({ access_token: 'new', refresh_token: 'rotated' });
    const retry = backend.expectOne(`${environment.apiUrl}/recipes`);
    expect(retry.request.headers.get('X-Workspace-Branch')).toBe('a1');
    retry.flush([]);
    http.get('https://example.com/file').subscribe();
    const outside = backend.expectOne('https://example.com/file');
    expect(outside.request.headers.has('X-Workspace-Company')).toBe(false);
    outside.flush({});
  });

  it('shares one refresh for concurrent failures and retries both', () => {
    const results: unknown[] = [];
    http.get(`${environment.apiUrl}/users/me`).subscribe((result) => results.push(result));
    http.get(`${environment.apiUrl}/appointments`).subscribe((result) => results.push(result));
    const a = backend.expectOne(`${environment.apiUrl}/users/me`);
    const b = backend.expectOne(`${environment.apiUrl}/appointments`);
    a.flush({}, { status: 401, statusText: 'Unauthorized' });
    b.flush({}, { status: 401, statusText: 'Unauthorized' });
    const refresh = backend.expectOne(`${environment.apiUrl}/auth/refresh`);
    expect(refresh.request.body).toEqual({ refresh_token: 'refresh' });
    expect(refresh.request.headers.has('Authorization')).toBe(false);
    refresh.flush({ access_token: 'new', refresh_token: 'rotated', token_type: 'bearer' });
    for (const url of ['/users/me', '/appointments']) {
      const retry = backend.expectOne(`${environment.apiUrl}${url}`);
      expect(retry.request.headers.get('Authorization')).toBe('Bearer new');
      retry.flush({ ok: true });
    }
    expect(results.length).toBe(2);
    expect(tokens.getRefreshToken()).toBe('rotated');
  });

  it('preserves the session on transient refresh errors', () => {
    let status = 0;
    http.get(`${environment.apiUrl}/users/me`).subscribe({ error: (e) => (status = e.status) });
    backend
      .expectOne(`${environment.apiUrl}/users/me`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    backend
      .expectOne(`${environment.apiUrl}/auth/refresh`)
      .flush({}, { status: 503, statusText: 'Unavailable' });
    expect(status).toBe(503);
    expect(tokens.getRefreshToken()).toBe('refresh');
  });

  it('never refreshes a forbidden request', () => {
    http.get(`${environment.apiUrl}/tenants`).subscribe({ error: () => {} });
    backend
      .expectOne(`${environment.apiUrl}/tenants`)
      .flush({}, { status: 403, statusText: 'Forbidden' });
    backend.expectNone(`${environment.apiUrl}/auth/refresh`);
  });
});
