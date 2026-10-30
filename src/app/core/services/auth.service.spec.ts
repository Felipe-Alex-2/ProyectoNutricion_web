import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

describe('Explicit logout destination', () => {
  it('clears the session and returns to the public landing even when remote logout fails', () => {
    const navigate = vi.fn();
    const clearTokens = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate } },
        {
          provide: TokenService,
          useValue: {
            getAccessToken: () => 'access-test',
            getRefreshToken: () => 'refresh-test',
            clearTokens,
          },
        },
      ],
    });
    const backend = TestBed.inject(HttpTestingController);
    const auth = TestBed.inject(AuthService);
    auth.logout();
    const request = backend.expectOne((r) => r.url.endsWith('/auth/logout'));
    expect(request.request.body).toEqual({ refresh_token: 'refresh-test' });
    expect(clearTokens).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/']);
    request.flush({}, { status: 503, statusText: 'Unavailable' });
    expect(auth.currentUser()).toBeNull();
    expect(navigate).toHaveBeenCalledTimes(1);
    backend.verify();
  });
});
