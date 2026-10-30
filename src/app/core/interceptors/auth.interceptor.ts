import {
  HttpBackend,
  HttpClient,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { TokenService } from '../services/token.service';
import { TokenResponse } from '../models/auth.model';
import { environment } from '../../../environments/environment';
import { WorkspaceContextService } from '../services/workspace-context.service';

const refreshRequests = new WeakMap<TokenService, Observable<TokenResponse>>();

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(TokenService);
  const router = inject(Router);
  const http = new HttpClient(inject(HttpBackend));
  const workspace = inject(WorkspaceContextService).headers();
  // Never send application credentials to another origin or an unrelated API.
  if (!req.url.startsWith(`${environment.apiUrl}/`)) return next(req);
  const publicAuth = [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/forgot-password',
    '/auth/reset-password',
  ].some((path) => req.url.split('?')[0] === `${environment.apiUrl}${path}`);
  const token = publicAuth ? null : tokens.getAccessToken();
  if (token) req = req.clone({ setHeaders: workspace });
  const authorized = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(authorized).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || publicAuth || req.url.includes('/auth/logout'))
        return throwError(() => error);
      const latest = tokens.getAccessToken();
      if (latest && latest !== token)
        return next(req.clone({ setHeaders: { Authorization: `Bearer ${latest}` } }));
      const refreshToken = tokens.getRefreshToken();
      if (!refreshToken) {
        tokens.clearTokens();
        void router.navigate(['/login']);
        return throwError(() => error);
      }
      let pending = refreshRequests.get(tokens);
      if (!pending) {
        pending = http
          .post<TokenResponse>(`${environment.apiUrl}/auth/refresh`, {
            refresh_token: refreshToken,
          })
          .pipe(
            tap((result) => tokens.saveTokens(result.access_token, result.refresh_token)),
            catchError((failure: HttpErrorResponse) => {
              if (failure.status === 401) {
                tokens.clearTokens();
                void router.navigate(['/login']);
              }
              return throwError(() => failure);
            }),
            finalize(() => refreshRequests.delete(tokens)),
            shareReplay({ bufferSize: 1, refCount: false }),
          );
        refreshRequests.set(tokens, pending);
      }
      return pending.pipe(
        switchMap((result) =>
          next(req.clone({ setHeaders: { Authorization: `Bearer ${result.access_token}` } })),
        ),
      );
    }),
  );
};
