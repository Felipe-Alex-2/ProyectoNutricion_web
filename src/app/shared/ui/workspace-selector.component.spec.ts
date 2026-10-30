import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { WorkspaceSelectorComponent } from './workspace-selector.component';

describe('Workspace selector permissions', () => {
  for (const role of ['SUPERADMIN', 'ADMIN_ORGANIZATION', 'NUTRICIONISTA']) {
    it(`selects authorized workspace for ${role}`, async () => {
      const user = signal({
        role_id: role,
        tenant_id: role === 'SUPERADMIN' ? null : 'a',
        branch_id: 'a1',
        active_tenant_id: 'a',
        active_branch_id: 'a1',
      });
      const save = vi.fn(() => of(user()));
      await TestBed.configureTestingModule({
        imports: [WorkspaceSelectorComponent],
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: AuthService, useValue: { currentUser: user, updateWorkspace: save } },
        ],
      }).compileComponents();
      const fixture = TestBed.createComponent(WorkspaceSelectorComponent);
      const http = TestBed.inject(HttpTestingController);
      fixture.detectChanges();
      http
        .expectOne((r) => r.url.endsWith('/workspace-options'))
        .flush({
          companies:
            role === 'SUPERADMIN'
              ? [
                  { id: 'a', name: 'A' },
                  { id: 'b', name: 'B' },
                ]
              : [{ id: 'a', name: 'A' }],
          branches: [
            { id: 'a1', name: 'Centro', tenant_id: 'a' },
            { id: 'a2', name: 'Norte', tenant_id: 'a' },
            { id: 'b1', name: 'Sur', tenant_id: 'b' },
          ],
        });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('select').length).toBe(
        role === 'SUPERADMIN' ? 2 : 1,
      );
      expect(fixture.componentInstance.companyBranches().map((b) => b.id)).toEqual(['a1', 'a2']);
      const changed = vi.fn();
      fixture.componentInstance.saved.subscribe(changed);
      fixture.componentInstance.branch = 'a2';
      fixture.componentInstance.save();
      expect(save).toHaveBeenCalledWith({ tenant_id: 'a', branch_id: 'a2' });
      expect(changed).toHaveBeenCalledOnce();
      if (role === 'SUPERADMIN') {
        fixture.componentInstance.company = '';
        fixture.componentInstance.branch = 'a2';
        fixture.componentInstance.save();
        expect(save).toHaveBeenLastCalledWith({ tenant_id: null, branch_id: null });
      }
      fixture.destroy();
      http.verify();
    });
  }
});
