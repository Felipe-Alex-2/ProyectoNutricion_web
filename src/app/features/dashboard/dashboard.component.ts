import { Component, HostListener, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { TenantService } from '../../core/services/tenant.service';
import { RBACService } from '../../core/services/rbac.service';
import { OrgUsersService } from '../../core/services/org-users.service';
import { PatientLinkService } from '../../core/services/patient-link.service';
import { User } from '../../core/models/user.model';
import { Tenant } from '../../core/models/tenant.model';
import { Role, Permission } from '../../core/models/rbac.model';
import { PatientLink } from '../../core/models/patient-link.model';
import { ActivityLogService } from '../../core/services/activity-log.service';
import { ActivityLog } from '../../core/models/activity-log.model';
import { RecipeService } from '../../core/services/recipe.service';
import { ClinicalService } from '../../core/services/clinical.service';
import { Recipe } from '../../core/models/recipe.model';
import { PatientAnamnesis, ClinicalRecord } from '../../core/models/clinical.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  isEditing = signal<boolean>(false);
  editForm: FormGroup;
  updateSuccess = signal<string | null>(null);
  updateError = signal<string | null>(null);

  // Estados interactivos para navegación principal: Menú Principal y Bitácora
  activeTab = signal<string>('principal');
  waterIntake = signal<number>(1200);

  // Bitácora de Actividades (Auditoría)
  activitySearch = signal<string>('');
  activityCategoryFilter = signal<string>('');

  // Acordeón Sprint 1
  sprint1Expanded = signal<boolean>(true);

  // Sprint 1: Tenants (CRUD)
  tenants = signal<Tenant[]>([]);
  isLoadingTenants = signal<boolean>(false);
  tenantModalOpen = signal<boolean>(false);
  editingTenant = signal<Tenant | null>(null);
  tenantForm: FormGroup;
  tenantSuccess = signal<string | null>(null);
  tenantError = signal<string | null>(null);

  // Modal: Usuarios Registrados del Tenant con Filtros
  tenantUsersModalOpen = signal<boolean>(false);
  selectedTenantForUsers = signal<Tenant | null>(null);
  tenantUsersList = signal<User[]>([]);
  isLoadingTenantUsers = signal<boolean>(false);
  tenantUserSearch = signal<string>('');
  tenantUserRoleFilter = signal<string>('');

  // Sprint 1: Gestión de Roles y Permisos
  roles = signal<Role[]>([]);
  allPermissions = signal<Permission[]>([]);
  isLoadingRoles = signal<boolean>(false);
  rolePermModalOpen = signal<boolean>(false);
  selectedRoleForPerms = signal<Role | null>(null);
  selectedPermIds = signal<string[]>([]);
  roleSuccess = signal<string | null>(null);
  roleError = signal<string | null>(null);

  // Sprint 1: Gestión de Usuarios de la Organización (CRUD + Aislamiento Tenant)
  orgUsers = signal<User[]>([]);
  isLoadingOrgUsers = signal<boolean>(false);
  userModalOpen = signal<boolean>(false);
  editingUser = signal<User | null>(null);
  orgUserForm: FormGroup;
  userFilterTenant = signal<string>('');
  userFilterRole = signal<string>('');
  userSuccess = signal<string | null>(null);
  userError = signal<string | null>(null);

  // Sprint 1: Vinculación Paciente (WhatsApp)
  patientLinks = signal<PatientLink[]>([]);
  isLoadingLinks = signal<boolean>(false);
  generateLinkForm: FormGroup;
  claimLinkForm: FormGroup;
  lastGeneratedLink = signal<PatientLink | null>(null);
  linkSuccess = signal<string | null>(null);
  linkError = signal<string | null>(null);
  claimSuccess = signal<string | null>(null);
  claimError = signal<string | null>(null);

  // Recetas Nutricionales con Foto y Macros
  recipeModalOpen = signal<boolean>(false);
  editingRecipe = signal<Recipe | null>(null);
  recipeSuccess = signal<string | null>(null);
  recipeError = signal<string | null>(null);
  recipeCategoryFilter = signal<string>('');
  recipeSelectedPatients = signal<string[]>([]);
  recipeForm: FormGroup;

  // Historial Clínico y Anamnesis
  selectedPatient = signal<User | null>(null);
  clinicalSuccess = signal<string | null>(null);
  clinicalError = signal<string | null>(null);
  clinicalForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    public themeService: ThemeService,
    private tenantService: TenantService,
    private rbacService: RBACService,
    private orgUsersService: OrgUsersService,
    private patientLinkService: PatientLinkService,
    public activityLogService: ActivityLogService,
    public recipeService: RecipeService,
    public clinicalService: ClinicalService
  ) {
    this.editForm = this.fb.group({
      full_name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
    });

    this.tenantForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      code: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(20)]],
      phone: ['+591 73683564'],
      email: ['', [Validators.email]],
      address: [''],
      description: [''],
    });

    this.orgUserForm = this.fb.group({
      full_name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['+591 73683564'],
      password: ['Nutri2026!'],
      role_id: ['NUTRICIONISTA', [Validators.required]],
      tenant_id: ['', [Validators.required]],
    });

    this.generateLinkForm = this.fb.group({
      whatsapp_number: ['+591 73683564', [Validators.required]],
      tenant_id: [''],
      notes: [''],
    });

    this.claimLinkForm = this.fb.group({
      pairing_code: ['', [Validators.required, Validators.minLength(6)]],
    });

    this.recipeForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      image_url: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c'],
      calories: [450, [Validators.required, Validators.min(0)]],
      protein: [30, [Validators.required, Validators.min(0)]],
      carbohydrates: [40, [Validators.required, Validators.min(0)]],
      fats: [15, [Validators.required, Validators.min(0)]],
      fiber: [6, [Validators.min(0)]],
      sodium: [250, [Validators.min(0)]],
      servings: [1, [Validators.required, Validators.min(1)]],
      prep_time_minutes: [15, [Validators.required, Validators.min(0)]],
      cook_time_minutes: [15, [Validators.required, Validators.min(0)]],
      difficulty: ['Fácil', [Validators.required]],
      category: ['Almuerzo', [Validators.required]],
      ingredients: ['', [Validators.required, Validators.minLength(3)]],
      instructions: ['', [Validators.required, Validators.minLength(5)]],
    });

    this.clinicalForm = this.fb.group({
      diagnosis: ['', [Validators.required, Validators.minLength(3)]],
      evolution_notes: [''],
      clinical_goals: [''],
    });
  }

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.populateForm(user);
    }
    this.loadTenants();
    this.loadRoles();
    this.loadPermissions();
    this.loadOrgUsers();
    this.loadPatientLinks();
    this.loadActivityLogs();
    this.loadRecipes();
    this.activityLogService.recordActivity('ACCESO', 'Acceso a la plataforma web', 'AUTH');
  }

  populateForm(user: User): void {
    this.editForm.patchValue({
      full_name: user.full_name,
      email: user.email,
    });
  }

  addWater(): void {
    this.waterIntake.update((val) => Math.min(val + 250, 3500));
  }

  toggleEdit(): void {
    this.isEditing.update((val) => !val);
    if (this.isEditing()) {
      const user = this.authService.currentUser();
      if (user) this.populateForm(user);
    }
    this.updateSuccess.set(null);
    this.updateError.set(null);
  }

  onSaveProfile(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.updateSuccess.set(null);
    this.updateError.set(null);

    this.authService.updateProfile(this.editForm.value).subscribe({
      next: () => {
        this.updateSuccess.set('¡Perfil actualizado correctamente!');
        this.isEditing.set(false);
        this.activityLogService.recordActivity('ACTUALIZAR_PERFIL', 'Actualización de datos personales', 'AUTH');
      },
      error: (err) => {
        const detail = err?.error?.detail;
        this.updateError.set(typeof detail === 'string' ? detail : 'Error al actualizar el perfil');
      },
    });
  }

  isClient(): boolean {
    return this.authService.currentUser()?.role_id === 'CLIENTE';
  }

  isNutritionist(): boolean {
    return this.authService.currentUser()?.role_id === 'NUTRICIONISTA';
  }

  canAccessSprint1(): boolean {
    // Only SaaS Admins, Org Admins, and Nutritionists can see Sprint 1 features
    return !this.isClient();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeAllModals();
  }

  closeAllModals(): void {
    this.closeTenantUsersModal();
    this.closeTenantModal();
    this.closeRolePermissionsModal();
    this.closeUserModal();
  }

  setActiveTab(tab: string): void {
    // Cerrar automáticamente cualquier modal abierto al salir o cambiar de vista
    this.closeAllModals();

    // Si el usuario es cliente (paciente), impedir acceso a módulos administrativos
    if (this.isClient() && tab.startsWith('sprint1-')) {
      this.activeTab.set('principal');
      return;
    }

    // Si es Nutricionista, solo puede entrar a vinculación
    if (this.isNutritionist() && (tab === 'sprint1-tenants' || tab === 'sprint1-roles' || tab === 'sprint1-usuarios')) {
      this.activeTab.set('sprint1-vinculacion');
      tab = 'sprint1-vinculacion';
    }

    // Si es Org Admin, no puede entrar a Tenants globales ni a Roles globales
    if (this.isOrgAdmin() && (tab === 'sprint1-tenants' || tab === 'sprint1-roles')) {
      this.activeTab.set('sprint1-usuarios');
      tab = 'sprint1-usuarios';
    }

    this.activeTab.set(tab);
    if (tab === 'bitacora') this.loadActivityLogs();
    if (tab === 'sprint1-tenants') this.loadTenants();
    if (tab === 'sprint1-roles') {
      this.loadRoles();
      this.loadPermissions();
    }
    if (tab === 'sprint1-usuarios') {
      this.loadTenants();
      this.loadOrgUsers();
    }
    if (tab === 'sprint1-vinculacion') {
      this.loadPatientLinks();
    }
    this.activityLogService.recordActivity('NAVEGACION', `Navegación a la vista: ${this.getTabLabel(tab)}`, 'SISTEMA');
  }

  toggleSprint1Accordion(): void {
    this.sprint1Expanded.update((v) => !v);
  }

  // --- Métodos de la Bitácora ---
  loadActivityLogs(): void {
    this.activityLogService.fetchLogs(this.activityCategoryFilter() || undefined).subscribe();
  }

  onActivitySearch(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.activitySearch.set(val);
  }

  setActivityCategory(cat: string): void {
    this.activityCategoryFilter.set(cat);
    this.loadActivityLogs();
  }

  clearActivityFilters(): void {
    this.activitySearch.set('');
    this.activityCategoryFilter.set('');
    this.loadActivityLogs();
  }

  clearLocalActivityLogs(): void {
    const ok = window.confirm('¿Deseas limpiar el registro de la bitácora local?');
    if (ok) {
      this.activityLogService.clearLocalLogs();
    }
  }

  filteredActivityLogs(): ActivityLog[] {
    const q = this.activitySearch().toLowerCase().trim();
    const cat = this.activityCategoryFilter();
    return this.activityLogService.logs().filter((log) => {
      const matchCat = !cat || log.category === cat;
      const matchQ =
        !q ||
        log.action.toLowerCase().includes(q) ||
        log.description.toLowerCase().includes(q) ||
        (log.user_name && log.user_name.toLowerCase().includes(q)) ||
        (log.user_email && log.user_email.toLowerCase().includes(q));
      return matchCat && matchQ;
    });
  }

  getTabLabel(tab: string): string {
    switch (tab) {
      case 'principal':
        return 'Menú Principal';
      case 'bitacora':
        return 'Bitácora';
      case 'sprint1-tenants':
        return 'Gestionar Tenants';
      case 'sprint1-roles':
        return 'Gestión de Roles y Permisos';
      case 'sprint1-usuarios':
        return 'Usuarios de Organización';
      case 'sprint1-vinculacion':
        return 'Vincular con Clientes';
      default:
        return tab;
    }
  }

  getActionBadgeClass(action: string): string {
    switch (action.toUpperCase()) {
      case 'LOGIN':
      case 'ACCESO':
        return 'act-badge-login';
      case 'LOGOUT':
        return 'act-badge-logout';
      case 'CREAR_TENANT':
      case 'TENANT_MUTATION':
      case 'USUARIOS_MUTATION':
        return 'act-badge-create';
      case 'ACTUALIZAR_PERFIL':
      case 'ACTUALIZAR_ROLES':
      case 'CAMBIO_TEMA':
        return 'act-badge-update';
      case 'NAVEGACION':
        return 'act-badge-nav';
      default:
        return 'act-badge-default';
    }
  }

  // --- Sprint 1: Tenants CRUD Methods ---
  loadTenants(): void {
    this.isLoadingTenants.set(true);
    this.tenantService.getTenants().subscribe({
      next: (res) => {
        this.tenants.set(res);
        this.isLoadingTenants.set(false);
        if (res.length > 0 && !this.orgUserForm.get('tenant_id')?.value) {
          const userTenant = this.authService.currentUser()?.tenant_id;
          this.orgUserForm.patchValue({ tenant_id: userTenant || res[0].id });
        }
      },
      error: () => this.isLoadingTenants.set(false),
    });
  }

  openTenantModal(): void {
    this.editingTenant.set(null);
    this.tenantForm.reset({
      name: '',
      code: '',
      phone: '+591 73683564',
      email: '',
      address: '',
      description: '',
    });
    this.tenantSuccess.set(null);
    this.tenantError.set(null);
    this.tenantModalOpen.set(true);
  }

  openEditTenantModal(tenant: Tenant): void {
    this.editingTenant.set(tenant);
    this.tenantForm.patchValue({
      name: tenant.name,
      code: tenant.code,
      phone: tenant.phone || '+591 73683564',
      email: tenant.email || '',
      address: tenant.address || '',
      description: tenant.description || '',
    });
    this.tenantSuccess.set(null);
    this.tenantError.set(null);
    this.tenantModalOpen.set(true);
  }

  closeTenantModal(): void {
    this.tenantModalOpen.set(false);
    this.editingTenant.set(null);
  }

  onSaveTenant(): void {
    if (this.tenantForm.invalid) {
      this.tenantForm.markAllAsTouched();
      return;
    }
    this.tenantSuccess.set(null);
    this.tenantError.set(null);

    const currentEdit = this.editingTenant();
    if (currentEdit) {
      this.tenantService.updateTenant(currentEdit.id, this.tenantForm.value).subscribe({
        next: (updated) => {
          this.tenantSuccess.set(`Clínica "${updated.name}" actualizada con éxito.`);
          this.loadTenants();
          setTimeout(() => this.closeTenantModal(), 1100);
        },
        error: (err) => {
          const msg = err?.error?.detail || 'Error al actualizar organización';
          this.tenantError.set(typeof msg === 'string' ? msg : JSON.stringify(msg));
        },
      });
    } else {
      this.tenantService.createTenant(this.tenantForm.value).subscribe({
        next: (created) => {
          this.tenantSuccess.set(`Clínica "${created.name}" creada exitosamente.`);
          this.loadTenants();
          setTimeout(() => this.closeTenantModal(), 1100);
        },
        error: (err) => {
          const msg = err?.error?.detail || 'Error al registrar el tenant';
          this.tenantError.set(typeof msg === 'string' ? msg : JSON.stringify(msg));
        },
      });
    }
  }

  onToggleTenant(tenant: Tenant): void {
    this.tenantService.toggleStatus(tenant.id).subscribe({
      next: () => this.loadTenants(),
    });
  }

  onDeleteTenant(tenant: Tenant): void {
    const confirmDelete = window.confirm(
      `¿Estás seguro de eliminar la organización "${tenant.name}" (${tenant.code})? Esta acción no se puede deshacer.`
    );
    if (!confirmDelete) return;

    this.tenantService.deleteTenant(tenant.id).subscribe({
      next: () => {
        this.loadTenants();
      },
      error: (err) => {
        const msg = err?.error?.detail || 'Error al eliminar la organización';
        alert(typeof msg === 'string' ? msg : JSON.stringify(msg));
      },
    });
  }

  // --- Modal: Ver Usuarios Registrados por Tenant y Filtros ---
  openTenantUsersModal(tenant: Tenant): void {
    this.selectedTenantForUsers.set(tenant);
    this.tenantUserSearch.set('');
    this.tenantUserRoleFilter.set('');
    this.tenantUsersModalOpen.set(true);
    this.loadTenantUsers(tenant.id);
  }

  openAllRegisteredUsersModal(): void {
    this.selectedTenantForUsers.set(null);
    this.tenantUserSearch.set('');
    this.tenantUserRoleFilter.set('');
    this.tenantUsersModalOpen.set(true);
    this.loadTenantUsers(undefined);
  }

  closeTenantUsersModal(): void {
    this.tenantUsersModalOpen.set(false);
    this.selectedTenantForUsers.set(null);
    this.tenantUsersList.set([]);
  }

  loadTenantUsers(tenantId?: string): void {
    this.isLoadingTenantUsers.set(true);
    this.orgUsersService.getUsers(tenantId).subscribe({
      next: (users) => {
        this.tenantUsersList.set(users);
        this.isLoadingTenantUsers.set(false);
      },
      error: (err) => {
        console.error('Error al cargar usuarios de la organización', err);
        this.isLoadingTenantUsers.set(false);
      },
    });
  }

  setTenantUserRoleFilter(roleId: string): void {
    this.tenantUserRoleFilter.set(roleId);
  }

  onTenantUserSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.tenantUserSearch.set(input.value);
  }

  clearTenantUserFilters(): void {
    this.tenantUserSearch.set('');
    this.tenantUserRoleFilter.set('');
  }

  filteredTenantUsers(): User[] {
    const q = this.tenantUserSearch().toLowerCase().trim();
    const role = this.tenantUserRoleFilter();
    return this.tenantUsersList().filter((u) => {
      const matchesRole = !role || u.role_id === role;
      const matchesQuery =
        !q ||
        (u.full_name?.toLowerCase().includes(q)) ||
        (u.email?.toLowerCase().includes(q)) ||
        (u.phone?.toLowerCase().includes(q));
      return matchesRole && matchesQuery;
    });
  }

  countUsersByRole(roleId: string): number {
    return this.tenantUsersList().filter((u) => u.role_id === roleId).length;
  }

  getRoleLabel(roleId?: string): string {
    switch (roleId) {
      case 'ADMIN_SAAS':
        return 'Administrador SaaS';
      case 'ADMIN_ORGANIZATION':
        return 'Administrador Normal';
      case 'NUTRICIONISTA':
        return 'Nutricionista';
      case 'CLIENTE':
        return 'Cliente';
      default:
        return roleId || 'Usuario';
    }
  }

  // --- Sprint 1: Gestión de Roles y Permisos ---
  loadRoles(): void {
    this.isLoadingRoles.set(true);
    this.rbacService.getRoles().subscribe({
      next: (res) => {
        this.roles.set(res);
        this.isLoadingRoles.set(false);
      },
      error: () => this.isLoadingRoles.set(false),
    });
  }

  loadPermissions(): void {
    this.rbacService.getPermissions().subscribe({
      next: (res) => this.allPermissions.set(res),
    });
  }

  openRolePermissionsModal(role: Role): void {
    this.selectedRoleForPerms.set(role);
    this.selectedPermIds.set(role.permissions.map((p) => p.id));
    this.roleSuccess.set(null);
    this.roleError.set(null);
    this.rolePermModalOpen.set(true);
  }

  closeRolePermissionsModal(): void {
    this.rolePermModalOpen.set(false);
    this.selectedRoleForPerms.set(null);
  }

  togglePermSelection(permId: string): void {
    const current = [...this.selectedPermIds()];
    const index = current.indexOf(permId);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(permId);
    }
    this.selectedPermIds.set(current);
  }

  isPermSelected(permId: string): boolean {
    return this.selectedPermIds().includes(permId);
  }

  onSaveRolePermissions(): void {
    const role = this.selectedRoleForPerms();
    if (!role) return;

    this.roleSuccess.set(null);
    this.roleError.set(null);

    this.rbacService.updateRolePermissions(role.id, this.selectedPermIds()).subscribe({
      next: () => {
        this.roleSuccess.set(`Permisos del rol "${role.name}" actualizados correctamente.`);
        this.loadRoles();
        setTimeout(() => this.closeRolePermissionsModal(), 1100);
      },
      error: (err) => {
        const msg = err?.error?.detail || 'Error al actualizar permisos del rol';
        this.roleError.set(typeof msg === 'string' ? msg : JSON.stringify(msg));
      },
    });
  }

  // --- Sprint 1: Gestión de Usuarios de la Organización (CRUD + Aislamiento) ---
  isOrgAdmin(): boolean {
    return this.authService.currentUser()?.role_id === 'ADMIN_ORGANIZATION';
  }

  isSaasAdmin(): boolean {
    return this.authService.currentUser()?.role_id === 'ADMIN_SAAS';
  }

  getMyOrgName(): string {
    const myTenantId = this.authService.currentUser()?.tenant_id;
    if (!myTenantId) return 'Sin Organización Asignada';
    return this.getTenantName(myTenantId);
  }

  loadOrgUsers(): void {
    this.isLoadingOrgUsers.set(true);
    // Si es ADMIN_ORGANIZATION, siempre forzar su tenant
    let tenantFilter = this.userFilterTenant() || undefined;
    if (this.isOrgAdmin()) {
      tenantFilter = this.authService.currentUser()?.tenant_id || undefined;
    }
    const roleFilter = this.userFilterRole() || undefined;

    this.orgUsersService.getUsers(tenantFilter, roleFilter).subscribe({
      next: (res) => {
        this.orgUsers.set(res);
        this.isLoadingOrgUsers.set(false);
      },
      error: () => this.isLoadingOrgUsers.set(false),
    });
  }

  openUserModal(): void {
    this.editingUser.set(null);
    const defaultTenant = this.isOrgAdmin()
      ? this.authService.currentUser()?.tenant_id || ''
      : this.tenants()[0]?.id || '';

    this.orgUserForm.reset({
      full_name: '',
      email: '',
      phone: '+591 73683564',
      password: 'Nutri2026!',
      role_id: 'NUTRICIONISTA',
      tenant_id: defaultTenant,
    });
    this.userSuccess.set(null);
    this.userError.set(null);
    this.userModalOpen.set(true);
  }

  openEditUserModal(user: User): void {
    this.editingUser.set(user);
    this.orgUserForm.patchValue({
      full_name: user.full_name,
      email: user.email,
      phone: user.phone || '+591 73683564',
      password: '',
      role_id: user.role_id,
      tenant_id: user.tenant_id || this.tenants()[0]?.id || '',
    });
    this.userSuccess.set(null);
    this.userError.set(null);
    this.userModalOpen.set(true);
  }

  closeUserModal(): void {
    this.userModalOpen.set(false);
    this.editingUser.set(null);
  }

  onSaveOrgUser(): void {
    if (this.orgUserForm.invalid) {
      this.orgUserForm.markAllAsTouched();
      return;
    }
    this.userSuccess.set(null);
    this.userError.set(null);

    // Si es Org Admin, forzar su tenant
    if (this.isOrgAdmin()) {
      this.orgUserForm.patchValue({
        tenant_id: this.authService.currentUser()?.tenant_id,
      });
    }

    const currentEdit = this.editingUser();
    if (currentEdit) {
      const payload: any = {
        full_name: this.orgUserForm.value.full_name,
        email: this.orgUserForm.value.email,
        phone: this.orgUserForm.value.phone,
        role_id: this.orgUserForm.value.role_id,
        tenant_id: this.orgUserForm.value.tenant_id,
      };
      if (
        this.isSaasAdmin() &&
        this.orgUserForm.value.password &&
        this.orgUserForm.value.password.trim().length > 0
      ) {
        payload.password = this.orgUserForm.value.password.trim();
      }

      this.orgUsersService.updateUser(currentEdit.id, payload).subscribe({
        next: (updated) => {
          this.userSuccess.set(`Usuario "${updated.full_name}" actualizado con éxito.`);
          this.loadOrgUsers();
          setTimeout(() => this.closeUserModal(), 1100);
        },
        error: (err) => {
          const msg = err?.error?.detail || 'Error al actualizar usuario';
          this.userError.set(typeof msg === 'string' ? msg : JSON.stringify(msg));
        },
      });
    } else {
      this.orgUsersService.createUser(this.orgUserForm.value).subscribe({
        next: (created) => {
          this.userSuccess.set(`Usuario "${created.full_name}" registrado correctamente.`);
          this.loadOrgUsers();
          setTimeout(() => this.closeUserModal(), 1100);
        },
        error: (err) => {
          const msg = err?.error?.detail || 'Error al crear usuario';
          this.userError.set(typeof msg === 'string' ? msg : JSON.stringify(msg));
        },
      });
    }
  }

  onToggleUserStatus(user: User): void {
    if (user.id === this.authService.currentUser()?.id) {
      alert('No puedes desactivar tu propia cuenta en sesión.');
      return;
    }

    this.orgUsersService.toggleUserStatus(user.id).subscribe({
      next: () => this.loadOrgUsers(),
      error: (err) => {
        const msg = err?.error?.detail || 'Error al cambiar estado del usuario';
        alert(typeof msg === 'string' ? msg : JSON.stringify(msg));
      },
    });
  }

  onDeleteUser(user: User): void {
    if (user.id === this.authService.currentUser()?.id) {
      alert('No puedes eliminar tu propia cuenta en sesión activa.');
      return;
    }

    const confirmDelete = window.confirm(
      `¿Estás seguro de eliminar al usuario "${user.full_name}" (${user.email})?`
    );
    if (!confirmDelete) return;

    this.orgUsersService.deleteUser(user.id).subscribe({
      next: () => {
        this.loadOrgUsers();
      },
      error: (err) => {
        const msg = err?.error?.detail || 'Error al eliminar usuario';
        alert(typeof msg === 'string' ? msg : JSON.stringify(msg));
      },
    });
  }

  onFilterTenantChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.userFilterTenant.set(val);
    this.loadOrgUsers();
  }

  onFilterRoleChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.userFilterRole.set(val);
    this.loadOrgUsers();
  }

  getTenantName(tenantId?: string): string {
    if (!tenantId) return 'Sin Organización';
    const t = this.tenants().find((item) => item.id === tenantId);
    return t ? t.name : 'Organización';
  }

  getRoleBadgeClass(roleId?: string): string {
    switch (roleId) {
      case 'ADMIN_SAAS':
        return 'badge-role-saas';
      case 'ADMIN_ORGANIZATION':
        return 'badge-role-org';
      case 'NUTRICIONISTA':
        return 'badge-role-nutri';
      case 'CLIENTE':
        return 'badge-role-client';
      default:
        return 'badge-role-default';
    }
  }

  // --- Sprint 1: Vinculación Paciente (WhatsApp) ---
  loadPatientLinks(): void {
    this.isLoadingLinks.set(true);
    this.patientLinkService.getLinks().subscribe({
      next: (res) => {
        this.patientLinks.set(res);
        this.isLoadingLinks.set(false);
      },
      error: () => this.isLoadingLinks.set(false),
    });
  }

  onGenerateLink(): void {
    if (this.generateLinkForm.invalid) return;

    this.linkSuccess.set(null);
    this.linkError.set(null);

    this.patientLinkService.generateLink(this.generateLinkForm.value).subscribe({
      next: (link) => {
        this.lastGeneratedLink.set(link);
        this.linkSuccess.set(`¡Código ${link.pairing_code} generado con éxito!`);
        this.loadPatientLinks();
      },
      error: (err) => {
        const msg = err?.error?.detail || 'Error al generar código de vinculación';
        this.linkError.set(typeof msg === 'string' ? msg : JSON.stringify(msg));
      },
    });
  }

  onClaimLink(): void {
    if (this.claimLinkForm.invalid) return;

    this.claimSuccess.set(null);
    this.claimError.set(null);

    this.patientLinkService.claimLink(this.claimLinkForm.value).subscribe({
      next: (res) => {
        this.claimSuccess.set(
          `¡Vinculación completada! Ahora estás enlazado con el especialista ${res.nutritionist_name}.`
        );
        this.claimLinkForm.reset({ pairing_code: '' });
        this.loadPatientLinks();
      },
      error: (err) => {
        const msg = err?.error?.detail || 'Error al canjear el código de vinculación';
        this.claimError.set(typeof msg === 'string' ? msg : JSON.stringify(msg));
      },
    });
  }

  // --- MÉTODOS DE RECETAS NUTRICIONALES (WEB) ---
  loadRecipes(category?: string): void {
    const cat = category !== undefined ? category : this.recipeCategoryFilter();
    this.recipeService.loadRecipes(cat || undefined).subscribe();
  }

  filterRecipesByCategory(cat: string): void {
    this.recipeCategoryFilter.set(cat);
    this.loadRecipes(cat);
  }

  openRecipeModal(recipe?: Recipe): void {
    this.recipeSuccess.set(null);
    this.recipeError.set(null);

    if (recipe) {
      this.editingRecipe.set(recipe);
      this.recipeSelectedPatients.set(recipe.assigned_patient_ids || []);
      this.recipeForm.patchValue({
        title: recipe.title,
        description: recipe.description || '',
        image_url: recipe.image_url || '',
        calories: recipe.calories,
        protein: recipe.protein,
        carbohydrates: recipe.carbohydrates,
        fats: recipe.fats,
        fiber: recipe.fiber,
        sodium: recipe.sodium || 0,
        servings: recipe.servings,
        prep_time_minutes: recipe.prep_time_minutes,
        cook_time_minutes: recipe.cook_time_minutes,
        difficulty: recipe.difficulty,
        category: recipe.category,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
      });
    } else {
      this.editingRecipe.set(null);
      this.recipeSelectedPatients.set([]);
      this.recipeForm.reset({
        title: '',
        description: '',
        image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
        calories: 450,
        protein: 30,
        carbohydrates: 40,
        fats: 15,
        fiber: 6,
        sodium: 200,
        servings: 1,
        prep_time_minutes: 15,
        cook_time_minutes: 15,
        difficulty: 'Fácil',
        category: 'Almuerzo',
        ingredients: '',
        instructions: '',
      });
    }
    this.recipeModalOpen.set(true);
  }

  closeRecipeModal(): void {
    this.recipeModalOpen.set(false);
    this.editingRecipe.set(null);
    this.recipeSelectedPatients.set([]);
  }

  togglePatientForRecipe(patientId: string): void {
    const current = this.recipeSelectedPatients();
    if (current.includes(patientId)) {
      this.recipeSelectedPatients.set(current.filter((id) => id !== patientId));
    } else {
      this.recipeSelectedPatients.set([...current, patientId]);
    }
  }

  isPatientSelectedForRecipe(patientId: string): boolean {
    return this.recipeSelectedPatients().includes(patientId);
  }

  selectAllPatientsForRecipe(select: boolean): void {
    if (select) {
      const allPatientIds = this.orgUsers()
        .filter((u) => u.role_id === 'CLIENTE')
        .map((u) => u.id);
      this.recipeSelectedPatients.set(allPatientIds);
    } else {
      this.recipeSelectedPatients.set([]);
    }
  }

  submitRecipe(): void {
    if (this.recipeForm.invalid) {
      this.recipeForm.markAllAsTouched();
      return;
    }

    this.recipeSuccess.set(null);
    this.recipeError.set(null);

    const formData = {
      ...this.recipeForm.value,
      assigned_patient_ids: this.recipeSelectedPatients(),
    };
    const editing = this.editingRecipe();

    if (editing) {
      this.recipeService.updateRecipe(editing.id, formData).subscribe({
        next: () => {
          this.recipeSuccess.set(`Receta '${formData.title}' actualizada exitosamente.`);
          this.closeRecipeModal();
          this.activityLogService.recordActivity('RECETA_MODIFICADA', `Se editó la receta ${formData.title}`, 'CLINICAL');
        },
        error: (err) => {
          this.recipeError.set(err?.error?.detail || 'Error al actualizar receta');
        },
      });
    } else {
      this.recipeService.createRecipe(formData).subscribe({
        next: () => {
          this.recipeSuccess.set(`Receta '${formData.title}' creada con éxito.`);
          this.closeRecipeModal();
          this.activityLogService.recordActivity('RECETA_CREADA', `Se creó la receta ${formData.title}`, 'CLINICAL');
        },
        error: (err) => {
          this.recipeError.set(err?.error?.detail || 'Error al crear receta');
        },
      });
    }
  }

  deleteRecipe(id: string, title: string): void {
    if (!confirm(`¿Estás seguro de eliminar la receta "${title}"?`)) return;

    this.recipeService.deleteRecipe(id).subscribe({
      next: () => {
        this.recipeSuccess.set(`Receta eliminada correctamente.`);
        this.activityLogService.recordActivity('RECETA_ELIMINADA', `Se eliminó la receta ${title}`, 'CLINICAL');
      },
      error: (err) => {
        this.recipeError.set(err?.error?.detail || 'Error al eliminar receta');
      },
    });
  }

  // --- MÉTODOS DE HISTORIAL CLÍNICO Y ANAMNESIS (WEB) ---
  selectPatientForClinical(patient: User): void {
    this.selectedPatient.set(patient);
    this.clinicalSuccess.set(null);
    this.clinicalError.set(null);
    this.clinicalForm.reset({
      diagnosis: '',
      evolution_notes: '',
      clinical_goals: '',
    });

    // Cargar anamnesis e historial clínico del paciente
    this.clinicalService.getPatientAnamnesis(patient.id).subscribe();
    this.clinicalService.getPatientClinicalRecords(patient.id).subscribe();
  }

  submitClinicalRecord(): void {
    const patient = this.selectedPatient();
    if (!patient) return;

    if (this.clinicalForm.invalid) {
      this.clinicalForm.markAllAsTouched();
      return;
    }

    this.clinicalSuccess.set(null);
    this.clinicalError.set(null);

    this.clinicalService.addClinicalRecord(patient.id, this.clinicalForm.value).subscribe({
      next: () => {
        this.clinicalSuccess.set('Registro clínico asentado exitosamente.');
        this.clinicalForm.reset({
          diagnosis: '',
          evolution_notes: '',
          clinical_goals: '',
        });
        this.activityLogService.recordActivity(
          'HISTORIAL_CLINICO',
          `Se asentó nota diagnóstica para ${patient.full_name}`,
          'CLINICAL'
        );
      },
      error: (err) => {
        this.clinicalError.set(err?.error?.detail || 'Error al guardar registro clínico');
      },
    });
  }

  openWhatsApp(url: string): void {
    window.open(url, '_blank');
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  logout(): void {
    this.activityLogService.clearLocalLogs();
    this.authService.logout();
  }
}
