import { Injectable, signal } from '@angular/core';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class WorkspaceContextService {
  readonly headers = signal<Record<string, string>>({});
  setUser(user: User | null) {
    if (!user || user.role_id === 'CLIENTE') {
      this.headers.set({});
      return;
    }
    this.headers.set({
      'X-Workspace-Company':
        user.role_id === 'SUPERADMIN' ? user.active_tenant_id || 'all' : user.tenant_id || 'all',
      'X-Workspace-Branch':
        user.active_branch_id || (user.role_id !== 'SUPERADMIN' ? user.branch_id : '') || 'all',
    });
  }
}
