import { Component, HostListener, OnInit, OnDestroy, signal } from '@angular/core';
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
import { SubscriptionService } from '../../core/services/subscription.service';
import { PaymentService } from '../../core/services/payment.service';
import { Recipe } from '../../core/models/recipe.model';
import { PatientAnamnesis, ClinicalRecord } from '../../core/models/clinical.model';
import { SubscriptionPlan, Subscription, SubscriptionHistory } from '../../core/models/subscription.model';
import { Payment, PaymentStats } from '../../core/models/payment.model';
import { Appointment, AppointmentCreate, AppointmentCancel, Nutritionist } from '../../core/models/appointment.model';
import { AppointmentService } from '../../core/services/appointment.service';
import { Notification } from '../../core/models/notification.model';
import { NotificationService } from '../../core/services/notification.service';
import { PatientService } from '../../core/services/patient.service';
import { BackupService } from '../../core/services/backup.service';
import { ReportService } from '../../core/services/report.service';
import { PatientListItem, UserUpdate } from '../../core/models/user.model';
import { BackupSetting, BackupLog } from '../../core/models/backup.model';
import { ReportEntityMeta, ReportQueryResponse } from '../../core/models/report.model';
import { AIRecommendationResponse } from '../../core/models/ai-recommendation.model';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  isEditing = signal<boolean>(false);
  editForm: FormGroup;
  updateSuccess = signal<string | null>(null);
  updateError = signal<string | null>(null);

  // Estados interactivos para navegación principal: Menú Principal y Bitácora
  activeTab = signal<string>('principal');
  waterIntake = signal<number>(1200);

  // Bitácora de Actividades (Auditoría) con Llave de Seguridad Confidencial
  activitySearch = signal<string>('');
  activityCategoryFilter = signal<string>('');
  bitacoraUnlocked = signal<boolean>(false);
  bitacoraKeyInput = signal<string>('');
  bitacoraKeyError = signal<string | null>(null);
  isVerifyingBitacoraKey = signal<boolean>(false);

  // Módulo de Clientes (Pacientes)
  patientForm: FormGroup;
  editingPatient = signal<PatientListItem | null>(null);
  patientEditModalOpen = signal<boolean>(false);
  deletingPatient = signal<PatientListItem | null>(null);
  patientDeleteModalOpen = signal<boolean>(false);
  patientSearch = signal<string>('');
  patientStatusFilter = signal<string>('');
  patientSuccess = signal<string | null>(null);
  patientError = signal<string | null>(null);

  // Módulo Asistente Inteligente IA (Recomendación Nutricional)
  aiModalOpen = signal<boolean>(false);
  selectedPatientForAi = signal<PatientListItem | null>(null);
  aiRecommendations = signal<AIRecommendationResponse | null>(null);
  isLoadingAi = signal<boolean>(false);
  aiError = signal<string | null>(null);
  aiAssignSuccess = signal<string | null>(null);

  // Módulo de Reportes Dinámicos
  selectedReportEntity = signal<string>('patients');
  selectedReportColumns = signal<string[]>([]);
  reportStartDate = signal<string>('');
  reportEndDate = signal<string>('');
  reportStatusFilter = signal<string>('');
  reportSearch = signal<string>('');
  reportPreviewData = signal<ReportQueryResponse | null>(null);
  isLoadingReport = signal<boolean>(false);
  isExportingReport = signal<boolean>(false);
  reportMessage = signal<string | null>(null);
  reportError = signal<string | null>(null);

  // Módulo de Copias de Seguridad (Backup)
  backupForm: FormGroup;
  backupSuccess = signal<string | null>(null);
  backupError = signal<string | null>(null);
  selectedRestoreFile: File | null = null;
  restoreModalOpen = signal<boolean>(false);
  isRestoringBackup = signal<boolean>(false);

  // Acordeón Sprint 1
  sprint1Expanded = signal<boolean>(true);

  // Acordeón Sprint 2
  sprint2Expanded = signal<boolean>(false);

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

  // Suscripción PayPal
  subscriptionPlans = signal<SubscriptionPlan[]>([]);
  currentSubscription = signal<Subscription | null>(null);
  subscriptionHistory = signal<SubscriptionHistory[]>([]);
  isLoadingSubscription = signal<boolean>(false);
  subscriptionSuccess = signal<string | null>(null);
  subscriptionError = signal<string | null>(null);

  // POS / Caja de Sucursal (Pagos y Cobros a Clientes con PayPal Sandbox)
  selectedPaymentTenantId = signal<string>('');
  paymentsList = signal<Payment[]>([]);
  paymentStats = signal<PaymentStats | null>(null);
  isLoadingPayments = signal<boolean>(false);
  isCreatingPayment = signal<boolean>(false);
  paymentError = signal<string | null>(null);
  paymentSuccess = signal<string | null>(null);
  paymentStatusFilter = signal<string>('');
  lastCreatedApprovalUrl = signal<string | null>(null);
  paymentForm: FormGroup;

  // Citas Médicas y Nutricionales
  appointments = signal<Appointment[]>([]);
  selectedAppointmentStatus = signal<string>('ALL');
  isLoadingAppointments = signal<boolean>(false);
  appointmentSuccess = signal<string | null>(null);
  appointmentError = signal<string | null>(null);
  cancelModalOpen = signal<boolean>(false);
  appointmentToCancel = signal<Appointment | null>(null);
  cancelReason = signal<string>('');
  cancellingAppointment = signal<boolean>(false);

  // Agenda y Disponibilidad por Nutricionista
  nutritionistsList = signal<Nutritionist[]>([]);
  selectedNutritionistScheduleId = signal<string>('ALL');
  selectedScheduleDate = signal<string>(new Date().toISOString().split('T')[0]);

  // Centro de Notificaciones
  notifications = signal<Notification[]>([]);
  unreadNotificationCount = signal<number>(0);
  isLoadingNotifications = signal<boolean>(false);
  newAppointmentAlert = signal<string | null>(null);
  private pollingTimer: any = null;

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
    public clinicalService: ClinicalService,
    private subscriptionService: SubscriptionService,
    private paymentService: PaymentService,
    private appointmentService: AppointmentService,
    private notificationService: NotificationService,
    public patientService: PatientService,
    public backupService: BackupService,
    public reportService: ReportService
  ) {
    this.editForm = this.fb.group({
      full_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(250)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      developer_key: [''],
    });

    this.patientForm = this.fb.group({
      full_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(250)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      is_active: [true],
    });

    this.backupForm = this.fb.group({
      auto_backup_enabled: [false],
      frequency_hours: [24, [Validators.required, Validators.min(1)]],
      retention_days: [30, [Validators.required, Validators.min(1)]],
    });

    this.paymentForm = this.fb.group({
      customer_name: ['', [Validators.required, Validators.minLength(2)]],
      customer_email: ['', [Validators.email]],
      concept: ['', [Validators.required, Validators.minLength(2)]],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      payment_method: ['PAYPAL', [Validators.required]],
      notes: [''],
    });

    this.tenantForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(250)]],
      code: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(20)]],
      phone: ['+591 73683564'],
      email: ['', [Validators.email]],
      address: [''],
      description: [''],
    });

    this.orgUserForm = this.fb.group({
      full_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(250)]],
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
      title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(250)]],
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
    this.loadNotificationCount();
    this.loadAppointments();
    this.activityLogService.recordActivity('ACCESO', 'Acceso a la plataforma web', 'AUTH');

    // Polling en tiempo real para citas pendientes y notificaciones (cada 12s)
    this.pollingTimer = setInterval(() => {
      this.pollPendingAppointmentsAndNotifications();
    }, 12000);
  }

  ngOnDestroy(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  populateForm(user: User): void {
    this.editForm.patchValue({
      full_name: user.full_name,
      email: user.email,
      phone: user.phone || '',
      developer_key: '',
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

  cancelEdit(): void {
    this.isEditing.set(false);
    const user = this.authService.currentUser();
    if (user) {
      this.populateForm(user);
    }
    this.editForm.markAsPristine();
    this.editForm.markAsUntouched();
    this.updateError.set(null);
  }

  onSaveProfile(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.updateSuccess.set(null);
    this.updateError.set(null);

    const formVal = this.editForm.value;
    const payload: UserUpdate = {
      full_name: formVal.full_name,
      email: formVal.email,
      phone: formVal.phone,
    };
    if (formVal.developer_key && formVal.developer_key.trim()) {
      payload.developer_key = formVal.developer_key.trim();
    }

    this.authService.updateProfile(payload).subscribe({
      next: () => {
        this.updateSuccess.set('¡Perfil actualizado correctamente!');
        this.isEditing.set(false);
        this.activityLogService.recordActivity('ACTUALIZAR_PERFIL', 'Actualización de datos personales y configuración de seguridad', 'AUTH');
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
    this.closeCancelAppointmentModal();
    this.closeEditPatient();
    this.closeDeletePatient();
    this.closeAiAssistant();
    this.closeRestoreModal();
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
    if (tab === 'bitacora') {
      if (this.bitacoraUnlocked()) {
        this.loadActivityLogs();
      }
    }
    if (tab === 'clientes') this.loadPatients();
    if (tab === 'reportes') this.loadReportConfig();
    if (tab === 'backup') this.loadBackupData();
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
    if (tab === 'suscripcion') {
      this.loadPaymentData();
      this.loadSubscriptionData();
    }
    if (tab === 'citas') {
      this.loadAppointments();
    }
    if (tab === 'notificaciones') {
      this.loadNotifications();
      this.loadNotificationCount();
    }
    this.activityLogService.recordActivity('NAVEGACION', `Navegación a la vista: ${this.getTabLabel(tab)}`, 'SISTEMA');
  }

  toggleSprint1Accordion(): void {
    this.sprint1Expanded.update((v) => !v);
  }

  toggleSprint2Accordion(): void {
    this.sprint2Expanded.update((v) => !v);
  }

  canAccessSprint2(): boolean {
    return !this.isClient();
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
      case 'suscripcion':
        return 'Gestión de Suscripción';
      case 'notificaciones':
        return 'Notificaciones';
      case 'sprint1-tenants':
        return 'Gestionar Tenants';
      case 'sprint1-roles':
        return 'Gestión de Roles y Permisos';
      case 'sprint1-usuarios':
        return 'Usuarios de Organización';
      case 'sprint1-vinculacion':
        return 'Vincular con Clientes';
      case 'recetas':
        return 'Plan Nutricional';
      case 'historial-clinico':
        return 'Evaluación Nutricional';
      case 'citas':
        return 'Gestión de Citas';
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

    const nameVal = this.tenantForm.value.name?.trim().toLowerCase();
    const currentEdit = this.editingTenant();
    const dupTenant = this.tenants().some(
      (t) => t.name?.trim().toLowerCase() === nameVal && (!currentEdit || t.id !== currentEdit.id)
    );
    if (dupTenant) {
      this.tenantError.set(
        `Ya existe una organización con el nombre "${this.tenantForm.value.name?.trim()}". No se puede repetir el mismo nombre.`
      );
      return;
    }

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

    const nameVal = this.orgUserForm.value.full_name?.trim().toLowerCase();
    const currentEdit = this.editingUser();
    const targetTenant = this.orgUserForm.value.tenant_id;
    const dupUser = this.orgUsers().some(
      (u) =>
        u.full_name?.trim().toLowerCase() === nameVal &&
        u.tenant_id === targetTenant &&
        (!currentEdit || u.id !== currentEdit.id)
    );
    if (dupUser) {
      this.userError.set(
        `Ya existe un usuario con el nombre "${this.orgUserForm.value.full_name?.trim()}" en esta organización. No se puede repetir el mismo nombre.`
      );
      return;
    }

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

    const titleVal = this.recipeForm.value.title?.trim().toLowerCase();
    const editing = this.editingRecipe();
    const dupRecipe = this.recipeService.recipes().some(
      (r: Recipe) => r.title?.trim().toLowerCase() === titleVal && (!editing || r.id !== editing.id)
    );
    if (dupRecipe) {
      this.recipeError.set(
        `Ya existe una receta con el nombre "${this.recipeForm.value.title?.trim()}". No se puede repetir el mismo nombre.`
      );
      return;
    }

    const formData = {
      ...this.recipeForm.value,
      assigned_patient_ids: this.recipeSelectedPatients(),
    };

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
        this.recipeSuccess.set(`Receta "${title}" eliminada correctamente.`);
        this.loadRecipes();
        this.activityLogService.recordActivity('RECETA_ELIMINADA', `Se eliminó la receta ${title}`, 'CLINICAL');
        setTimeout(() => this.recipeSuccess.set(null), 4000);
      },
      error: (err) => {
        this.recipeError.set(err?.error?.detail || 'Error al eliminar receta');
        setTimeout(() => this.recipeError.set(null), 5000);
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

  // --- MÉTODOS DE SUSCRIPCIÓN PAYPAL ---

  loadSubscriptionData(): void {
    this.isLoadingSubscription.set(true);
    this.subscriptionSuccess.set(null);
    this.subscriptionError.set(null);

    // Load plans
    this.subscriptionService.getPlans().subscribe({
      next: (plans) => this.subscriptionPlans.set(plans),
      error: () => {},
    });

    // Load current subscription
    this.subscriptionService.getCurrentSubscription().subscribe({
      next: (sub) => this.currentSubscription.set(sub),
      error: () => {},
    });

    // Load history
    this.subscriptionService.getHistory().subscribe({
      next: (history) => {
        this.subscriptionHistory.set(history);
        this.isLoadingSubscription.set(false);
      },
      error: () => this.isLoadingSubscription.set(false),
    });
  }

  onSubscribe(planName: string): void {
    this.subscriptionError.set(null);
    this.subscriptionSuccess.set(null);
    this.isLoadingSubscription.set(true);

    this.subscriptionService.createOrder(planName).subscribe({
      next: (response) => {
        this.isLoadingSubscription.set(false);
        // Abrir PayPal checkout en una nueva pestaña
        window.open(response.approval_url, '_blank');
      },
      error: (err) => {
        this.isLoadingSubscription.set(false);
        this.subscriptionError.set(
          err?.error?.detail || 'Error al crear la orden de PayPal. Intenta de nuevo.'
        );
      },
    });
  }

  onCancelSubscription(): void {
    if (!confirm('¿Estás seguro de cancelar tu suscripción activa? Perderás acceso a las funcionalidades premium.')) {
      return;
    }

    this.isLoadingSubscription.set(true);
    this.subscriptionService.cancelSubscription().subscribe({
      next: (sub) => {
        this.currentSubscription.set(null);
        this.subscriptionSuccess.set('Suscripción cancelada exitosamente.');
        this.activityLogService.recordActivity('SUSCRIPCION_CANCELADA', `Se canceló la suscripción plan ${sub.plan_name}`, 'SISTEMA');
        this.loadSubscriptionData();
      },
      error: (err) => {
        this.isLoadingSubscription.set(false);
        this.subscriptionError.set(err?.error?.detail || 'Error al cancelar la suscripción.');
      },
    });
  }

  getSubscriptionStatusClass(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'sub-status-active';
      case 'PENDING': return 'sub-status-pending';
      case 'CANCELLED': return 'sub-status-cancelled';
      case 'EXPIRED': return 'sub-status-expired';
      case 'REPLACED': return 'sub-status-replaced';
      default: return 'sub-status-default';
    }
  }

  getSubscriptionStatusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'Activa';
      case 'PENDING': return 'Pendiente';
      case 'CANCELLED': return 'Cancelada';
      case 'EXPIRED': return 'Expirada';
      case 'REPLACED': return 'Reemplazada';
      case 'FAILED': return 'Fallida';
      default: return status;
    }
  }

  getPlanDisplayName(name: string): string {
    switch (name) {
      case 'BASICO': return 'Básico';
      case 'PROFESIONAL': return 'Profesional';
      case 'PREMIUM': return 'Premium';
      default: return name;
    }
  }

  isAdmin(): boolean {
    return this.isSaasAdmin() || this.isOrgAdmin();
  }

  activeTenantName(): string {
    return this.getMyOrgName();
  }

  // =========================================================================
  // POS: Caja y Cobros a Clientes en Sucursal con PayPal Sandbox
  // =========================================================================

  loadPaymentData(): void {
    this.isLoadingPayments.set(true);
    this.paymentError.set(null);

    // Asegurar que tengamos las sucursales cargadas
    if (this.tenants().length === 0) {
      this.loadTenants();
    }

    // Resolver sucursal seleccionada
    let tenantId = this.selectedPaymentTenantId();
    if (!tenantId) {
      const userTenant = this.authService.currentUser()?.tenant_id;
      if (userTenant) {
        tenantId = userTenant;
      } else if (this.tenants().length > 0) {
        tenantId = this.tenants()[0].id;
      }
      if (tenantId) {
        this.selectedPaymentTenantId.set(tenantId);
      }
    }

    const currentTenant = this.selectedPaymentTenantId() || undefined;
    const filter = this.paymentStatusFilter() || undefined;

    // Cargar historial de cobros
    this.paymentService.getPayments(currentTenant, filter).subscribe({
      next: (payments) => {
        if (this.paymentStatusFilter() === 'EFECTIVO') {
          this.paymentsList.set(
            payments.filter((p) => (p.payment_method || '').toUpperCase() === 'EFECTIVO')
          );
        } else {
          this.paymentsList.set(payments);
        }
        this.isLoadingPayments.set(false);
      },
      error: (err) => {
        this.isLoadingPayments.set(false);
        this.paymentError.set(err?.error?.detail || 'Error al cargar cobros de la sucursal');
      },
    });

    // Cargar métricas de caja
    this.paymentService.getStats(currentTenant).subscribe({
      next: (stats) => this.paymentStats.set(stats),
      error: () => {},
    });
  }

  onPaymentTenantChange(tenantId: string): void {
    this.selectedPaymentTenantId.set(tenantId);
    this.loadPaymentData();
  }

  onPaymentStatusFilterChange(status: string): void {
    this.paymentStatusFilter.set(status);
    this.loadPaymentData();
  }

  setPaymentMethod(method: 'PAYPAL' | 'EFECTIVO'): void {
    this.paymentForm.patchValue({ payment_method: method });
  }

  setQuickConcept(concept: string, defaultPrice: number): void {
    this.paymentForm.patchValue({
      concept: concept,
      amount: defaultPrice,
    });
  }

  onSubmitPayment(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      this.paymentError.set(
        'Por favor completa los campos requeridos arriba: Nombre del Cliente, Concepto del Servicio y Total a cobrar.'
      );
      return;
    }

    let tenantId = this.selectedPaymentTenantId();
    if (!tenantId) {
      const userTenant = this.authService.currentUser()?.tenant_id;
      if (userTenant) {
        tenantId = userTenant;
      } else if (this.tenants().length > 0) {
        tenantId = this.tenants()[0].id;
      }
      if (tenantId) {
        this.selectedPaymentTenantId.set(tenantId);
      } else {
        this.paymentError.set('Por favor selecciona una sucursal para registrar el cobro.');
        return;
      }
    }

    this.isCreatingPayment.set(true);
    this.paymentError.set(null);
    this.paymentSuccess.set(null);

    const formVal = this.paymentForm.value;
    const paymentMethod = formVal.payment_method || 'PAYPAL';
    const payload = {
      tenant_id: tenantId,
      customer_name: formVal.customer_name ? formVal.customer_name.trim() : '',
      customer_email: formVal.customer_email ? formVal.customer_email.trim() : null,
      concept: formVal.concept ? formVal.concept.trim() : '',
      amount: parseFloat(formVal.amount),
      currency: 'USD',
      payment_method: paymentMethod,
      notes: formVal.notes ? formVal.notes.trim() : null,
    };

    this.paymentService.createPayment(payload).subscribe({
      next: (res) => {
        this.isCreatingPayment.set(false);
        this.activityLogService.recordActivity(
          'COBRO_CREADO',
          `Cobro de $${res.amount} USD a ${res.customer_name} por "${res.concept}" (${paymentMethod})`,
          'SISTEMA'
        );

        if (paymentMethod === 'EFECTIVO') {
          this.lastCreatedApprovalUrl.set(null);
          this.paymentSuccess.set(
            `¡Cobro de $${res.amount} USD en Efectivo registrado con éxito para ${res.customer_name}!`
          );
          this.paymentForm.patchValue({
            customer_name: '',
            customer_email: '',
            concept: '',
            amount: null,
            notes: '',
          });
          this.paymentForm.markAsPristine();
          this.paymentForm.markAsUntouched();
          this.loadPaymentData();
        } else {
          this.lastCreatedApprovalUrl.set(res.approval_url || null);
          this.paymentSuccess.set(
            '¡Orden generada! Si estás en el mismo navegador donde abriste tu cuenta Business de PayPal, copia el enlace y ábrelo en una Ventana de Incógnito para pagar con tu cuenta Personal.'
          );
          this.loadPaymentData();
          if (res.approval_url) {
            window.open(res.approval_url, '_blank');
          }
        }
      },
      error: (err) => {
        this.isCreatingPayment.set(false);
        this.paymentError.set(
          err?.error?.detail || 'Error al procesar el cobro. Verifica tus datos o conexión.'
        );
      },
    });
  }

  copyPaymentLink(paypalOrderId?: string | null): void {
    const url = paypalOrderId
      ? `https://www.sandbox.paypal.com/checkoutnow?token=${paypalOrderId}`
      : this.lastCreatedApprovalUrl();
    if (!url) {
      alert('No hay enlace de pago disponible.');
      return;
    }
    navigator.clipboard.writeText(url).then(() => {
      this.paymentSuccess.set(
        '¡Enlace de pago copiado! Pégalo en una Ventana de Incógnito para iniciar sesión con tu cuenta Personal de prueba.'
      );
    });
  }

  onCancelPaymentOrder(paymentId: string): void {
    if (!confirm('¿Deseas cancelar esta orden de cobro pendiente?')) {
      return;
    }

    this.paymentService.cancelPayment(paymentId).subscribe({
      next: () => {
        this.paymentSuccess.set('Cobro cancelado correctamente.');
        this.loadPaymentData();
      },
      error: (err) => {
        this.paymentError.set(err?.error?.detail || 'Error al cancelar el cobro.');
      },
    });
  }

  onResumePayment(payment: Payment): void {
    if (!payment.paypal_order_id) {
      alert('Esta orden no cuenta con un identificador de PayPal asociado.');
      return;
    }
    // Abrir PayPal Checkout Sandbox en una nueva pestaña para continuar la transacción
    window.open(
      `https://www.sandbox.paypal.com/checkoutnow?token=${payment.paypal_order_id}`,
      '_blank'
    );
  }

  getPaymentStatusBadgeClass(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'badge-completed';
      case 'PENDING': return 'badge-pending';
      case 'CANCELLED': return 'badge-cancelled';
      case 'FAILED': return 'badge-failed';
      default: return '';
    }
  }

  getPaymentStatusBadgeLabel(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'Pagado';
      case 'PENDING': return 'Pendiente';
      case 'CANCELLED': return 'Cancelado';
      case 'FAILED': return 'Fallido';
      default: return status;
    }
  }

  getPaymentMethodBadgeClass(method?: string): string {
    const m = (method || 'PAYPAL').toUpperCase();
    return m === 'EFECTIVO' ? 'method-cash' : 'method-paypal';
  }

  getPaymentMethodBadgeLabel(method?: string): string {
    const m = (method || 'PAYPAL').toUpperCase();
    return m === 'EFECTIVO' ? 'Efectivo' : 'PayPal';
  }

  // ==========================================
  // MÉTODOS DE CITAS MÉDICAS / NUTRICIONALES
  // ==========================================
  loadAppointments(): void {
    this.isLoadingAppointments.set(true);
    this.appointmentError.set(null);
    const tenantId = this.isOrgAdmin()
      ? this.authService.currentUser()?.tenant_id || undefined
      : (this.selectedPaymentTenantId() || undefined);

    this.appointmentService.getAppointments(this.selectedAppointmentStatus(), tenantId).subscribe({
      next: (data) => {
        this.appointments.set(data);
        this.isLoadingAppointments.set(false);
      },
      error: (err) => {
        this.appointmentError.set(err?.error?.detail || 'Error al cargar las citas.');
        this.isLoadingAppointments.set(false);
      },
    });

    this.loadNutritionists();
  }

  loadNutritionists(): void {
    const tenantId = this.isOrgAdmin()
      ? this.authService.currentUser()?.tenant_id || undefined
      : (this.selectedPaymentTenantId() || undefined);

    this.appointmentService.getNutritionists(tenantId).subscribe({
      next: (data) => {
        this.nutritionistsList.set(data);
      },
      error: () => {},
    });
  }

  setAppointmentStatusFilter(status: string): void {
    this.selectedAppointmentStatus.set(status);
    this.loadAppointments();
  }

  setNutritionistScheduleFilter(nutriId: string): void {
    this.selectedNutritionistScheduleId.set(nutriId);
  }

  setScheduleDate(dateStr: string): void {
    this.selectedScheduleDate.set(dateStr);
  }

  get todayIsoDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  // Citas confirmadas con su rango explícito de 30 minutos
  get confirmedScheduleAppointments(): (Appointment & { timeRange: string; endTime: string })[] {
    const selectedDate = this.selectedScheduleDate();
    const selectedNutri = this.selectedNutritionistScheduleId();

    return this.appointments()
      .filter((a) => {
        if (a.status !== 'CONFIRMED') return false;
        if (selectedNutri !== 'ALL' && a.nutritionist_id !== selectedNutri) return false;
        if (selectedDate) {
          const aDate = new Date(a.scheduled_at).toISOString().split('T')[0];
          if (aDate !== selectedDate) return false;
        }
        return true;
      })
      .map((a) => {
        const start = new Date(a.scheduled_at);
        const end = new Date(start.getTime() + 30 * 60 * 1000);
        const pad = (n: number) => n.toString().padStart(2, '0');
        const startStr = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
        const endStr = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
        return {
          ...a,
          timeRange: `${startStr} - ${endStr}`,
          endTime: endStr,
        };
      })
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  }

  // Generador visual de bloques de 30 min (08:00 a 18:00) para disponibilidad
  get dayScheduleSlots(): { timeSlot: string; isOccupied: boolean; appointment?: Appointment & { timeRange: string } }[] {
    const confirmed = this.confirmedScheduleAppointments;
    const slots: { timeSlot: string; isOccupied: boolean; appointment?: Appointment & { timeRange: string } }[] = [];
    const pad = (n: number) => n.toString().padStart(2, '0');

    for (let h = 8; h < 18; h++) {
      for (const m of [0, 30]) {
        const slotStart = `${pad(h)}:${pad(m)}`;
        const endM = m === 0 ? 30 : 0;
        const endH = m === 0 ? h : h + 1;
        const slotEnd = `${pad(endH)}:${pad(endM)}`;
        const timeSlot = `${slotStart} - ${slotEnd}`;

        const slotMinutes = h * 60 + m;
        const matching = confirmed.find((a) => {
          const d = new Date(a.scheduled_at);
          const apptMinutes = d.getHours() * 60 + d.getMinutes();
          return Math.abs(slotMinutes - apptMinutes) < 30;
        });

        slots.push({
          timeSlot,
          isOccupied: !!matching,
          appointment: matching,
        });
      }
    }
    return slots;
  }

  confirmAppointment(appointment: Appointment): void {
    const timeFormatted = this.formatDateTime(appointment.scheduled_at);
    if (!confirm(`¿Deseas confirmar la cita con ${appointment.patient_name || 'el paciente'} para el ${timeFormatted}?`)) {
      return;
    }
    this.appointmentError.set(null);
    this.appointmentSuccess.set(null);

    // Pre-validación en frontend de solapamiento de 30 minutos para el mismo doctor
    const apptTime = new Date(appointment.scheduled_at).getTime();
    const conflict = this.appointments().find((a) => {
      if (a.id === appointment.id || a.status !== 'CONFIRMED' || a.nutritionist_id !== appointment.nutritionist_id) {
        return false;
      }
      const existingTime = new Date(a.scheduled_at).getTime();
      return Math.abs(existingTime - apptTime) < 30 * 60 * 1000;
    });

    if (conflict) {
      const conflictFormatted = this.formatDateTime(conflict.scheduled_at);
      const doctorName = appointment.nutritionist_name || 'El especialista';
      this.appointmentError.set(
        `Conflicto de Horario: ${doctorName} ya tiene una cita confirmada para el ${conflictFormatted}. Cada consulta ocupa un bloque de 30 minutos.`
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    this.appointmentService.confirmAppointment(appointment.id).subscribe({
      next: (updated) => {
        this.appointmentSuccess.set(`¡Cita confirmada con éxito! Se ha notificado a ${updated.patient_name || 'el paciente'}.`);
        this.loadAppointments();
        this.loadNotificationCount();
        this.activityLogService.recordActivity('CONFIRMAR_CITA', `Cita confirmada para ${updated.patient_name}`, 'SISTEMA');
        setTimeout(() => this.appointmentSuccess.set(null), 6000);
      },
      error: (err) => {
        this.appointmentError.set(
          err?.error?.detail || 'Error al confirmar la cita. El nutricionista ya se encuentra ocupado en ese horario.'
        );
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    });
  }

  openCancelAppointmentModal(appointment: Appointment): void {
    this.appointmentToCancel.set(appointment);
    this.cancelReason.set('');
    this.cancelModalOpen.set(true);
  }

  closeCancelAppointmentModal(): void {
    this.cancelModalOpen.set(false);
    this.appointmentToCancel.set(null);
    this.cancelReason.set('');
  }

  onCancelReasonChange(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.cancelReason.set(target.value);
  }

  submitCancelAppointment(): void {
    const appt = this.appointmentToCancel();
    if (!appt) return;

    this.cancellingAppointment.set(true);
    this.appointmentError.set(null);
    this.appointmentSuccess.set(null);

    const reason = this.cancelReason().trim() || 'Cancelada por el administrador/nutricionista';
    this.appointmentService.cancelAppointment(appt.id, reason).subscribe({
      next: (cancelled) => {
        this.cancellingAppointment.set(false);
        this.closeCancelAppointmentModal();
        this.appointmentSuccess.set(`La cita ha sido cancelada. Se ha enviado notificación a ${cancelled.patient_name || 'el paciente'} con el motivo especificado.`);
        this.loadAppointments();
        this.loadNotificationCount();
        this.activityLogService.recordActivity('CANCELAR_CITA', `Cita cancelada para ${cancelled.patient_name}`, 'SISTEMA');
        setTimeout(() => this.appointmentSuccess.set(null), 6000);
      },
      error: (err) => {
        this.cancellingAppointment.set(false);
        this.appointmentError.set(err?.error?.detail || 'Error al cancelar la cita.');
      },
    });
  }

  get totalAppointmentsCount(): number {
    return this.appointments().length;
  }

  get pendingAppointmentsCount(): number {
    return this.appointments().filter((a) => a.status === 'PENDING').length;
  }

  get confirmedAppointmentsCount(): number {
    return this.appointments().filter((a) => a.status === 'CONFIRMED').length;
  }

  get cancelledAppointmentsCount(): number {
    return this.appointments().filter((a) => a.status === 'CANCELLED').length;
  }

  getAppointmentBadgeClass(status: string): string {
    switch (status) {
      case 'PENDING': return 'badge-appt-pending';
      case 'CONFIRMED': return 'badge-appt-confirmed';
      case 'CANCELLED': return 'badge-appt-cancelled';
      default: return '';
    }
  }

  getAppointmentBadgeLabel(status: string): string {
    switch (status) {
      case 'PENDING': return 'Pendiente';
      case 'CONFIRMED': return 'Confirmada';
      case 'CANCELLED': return 'Cancelada';
      default: return status;
    }
  }

  formatDateTime(dateStr: string): string {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // ==========================================
  // MÉTODOS DE NOTIFICACIONES Y ALERTAS
  // ==========================================
  loadNotificationCount(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (res) => {
        this.unreadNotificationCount.set(res.unread_count);
      },
      error: () => {},
    });
  }

  loadNotifications(): void {
    this.isLoadingNotifications.set(true);
    this.notificationService.getMyNotifications(50).subscribe({
      next: (list) => {
        this.notifications.set(list);
        this.isLoadingNotifications.set(false);
        this.loadNotificationCount();
      },
      error: () => {
        this.isLoadingNotifications.set(false);
      },
    });
  }

  markNotificationAsRead(notif: Notification): void {
    if (notif.is_read) return;
    this.notificationService.markAsRead(notif.id).subscribe({
      next: () => {
        notif.is_read = true;
        this.notifications.update((list) => [...list]);
        this.unreadNotificationCount.update((c) => Math.max(0, c - 1));
      },
      error: () => {},
    });
  }

  markAllNotificationsAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.update((list) =>
          list.map((n) => ({ ...n, is_read: true }))
        );
        this.unreadNotificationCount.set(0);
      },
      error: () => {},
    });
  }

  pollPendingAppointmentsAndNotifications(): void {
    this.loadNotificationCount();
    const tenantId = this.isOrgAdmin()
      ? this.authService.currentUser()?.tenant_id || undefined
      : (this.selectedPaymentTenantId() || undefined);

    this.appointmentService.getAppointments(this.selectedAppointmentStatus(), tenantId).subscribe({
      next: (data) => {
        const prevPending = this.pendingAppointmentsCount;
        this.appointments.set(data);
        const currentPending = this.pendingAppointmentsCount;
        if (currentPending > prevPending && prevPending >= 0) {
          this.newAppointmentAlert.set(
            `¡Tienes ${currentPending} cita(s) pendiente(s) por atender!`
          );
          setTimeout(() => this.newAppointmentAlert.set(null), 8000);
        }
      },
      error: () => {},
    });
  }

  // ==========================================
  // BITÁCORA: LLAVE DE SEGURIDAD CONFIDENCIAL
  // ==========================================
  verifyAndUnlockBitacora(): void {
    const key = this.bitacoraKeyInput().trim();
    if (!key) {
      this.bitacoraKeyError.set('Ingresa la contraseña de tu cuenta o tu llave personalizada.');
      return;
    }
    this.isVerifyingBitacoraKey.set(true);
    this.bitacoraKeyError.set(null);

    this.authService.verifyDeveloperKey(key).subscribe({
      next: (res) => {
        this.isVerifyingBitacoraKey.set(false);
        if (res.valid) {
          this.bitacoraUnlocked.set(true);
          this.bitacoraKeyInput.set('');
          this.loadActivityLogs();
        } else {
          this.bitacoraKeyError.set(res.message || 'La llave o contraseña de administrador es incorrecta.');
        }
      },
      error: (err: any) => {
        this.isVerifyingBitacoraKey.set(false);
        this.bitacoraKeyError.set(err?.error?.detail || 'Error al validar la llave de seguridad.');
      },
    });
  }

  lockBitacora(): void {
    this.bitacoraUnlocked.set(false);
    this.bitacoraKeyInput.set('');
    this.bitacoraKeyError.set(null);
  }

  // ==========================================
  // MÓDULO DE CLIENTES / PACIENTES
  // ==========================================
  loadPatients(): void {
    const filterActive = this.patientStatusFilter() === '' ? undefined : this.patientStatusFilter() === 'true';
    this.patientService.getPatients(this.patientSearch(), filterActive).subscribe();
  }

  openEditPatient(patient: PatientListItem): void {
    this.editingPatient.set(patient);
    this.patientForm.patchValue({
      full_name: patient.full_name,
      email: patient.email,
      phone: patient.phone || '',
      is_active: patient.is_active,
    });
    this.patientEditModalOpen.set(true);
  }

  closeEditPatient(): void {
    this.patientEditModalOpen.set(false);
    this.editingPatient.set(null);
  }

  saveEditPatient(): void {
    if (this.patientForm.invalid || !this.editingPatient()) return;
    const p = this.editingPatient()!;
    const val = this.patientForm.value;
    this.patientService.updatePatient(p.id, val).subscribe({
      next: () => {
        this.patientSuccess.set('Datos del cliente actualizados exitosamente.');
        setTimeout(() => this.patientSuccess.set(null), 3500);
        this.closeEditPatient();
      },
      error: (err: any) => {
        this.patientError.set(err?.error?.detail || 'Error al actualizar el cliente');
        setTimeout(() => this.patientError.set(null), 4000);
      },
    });
  }

  openDeletePatient(patient: PatientListItem): void {
    this.deletingPatient.set(patient);
    this.patientDeleteModalOpen.set(true);
  }

  closeDeletePatient(): void {
    this.patientDeleteModalOpen.set(false);
    this.deletingPatient.set(null);
  }

  confirmDeletePatient(): void {
    if (!this.deletingPatient()) return;
    const p = this.deletingPatient()!;
    this.patientService.deletePatient(p.id).subscribe({
      next: () => {
        this.patientSuccess.set(`El cliente '${p.full_name}' ha sido desactivado y desvinculado.`);
        setTimeout(() => this.patientSuccess.set(null), 4000);
        this.closeDeletePatient();
      },
      error: (err: any) => {
        this.patientError.set(err?.error?.detail || 'Error al desactivar el cliente');
        setTimeout(() => this.patientError.set(null), 4000);
      },
    });
  }

  // ==========================================
  // ASISTENTE IA DE RECOMENDACIÓN NUTRICIONAL
  // ==========================================
  openAiAssistant(patient: PatientListItem): void {
    this.selectedPatientForAi.set(patient);
    this.aiModalOpen.set(true);
    this.isLoadingAi.set(true);
    this.aiError.set(null);
    this.aiAssignSuccess.set(null);
    this.clinicalService.getAiRecommendations(patient.id).subscribe({
      next: (data) => {
        this.aiRecommendations.set(data);
        this.isLoadingAi.set(false);
      },
      error: (err: any) => {
        this.aiError.set(err?.error?.detail || 'Error al consultar al Asistente Inteligente IA');
        this.isLoadingAi.set(false);
      },
    });
  }

  closeAiAssistant(): void {
    this.aiModalOpen.set(false);
    this.selectedPatientForAi.set(null);
    this.aiRecommendations.set(null);
    this.aiError.set(null);
    this.aiAssignSuccess.set(null);
  }

  assignAiRecipe(recipeId: string): void {
    const patient = this.selectedPatientForAi();
    if (!patient) return;
    this.recipeService.assignRecipe(recipeId, patient.id).subscribe({
      next: () => {
        this.aiAssignSuccess.set('¡Receta prescrita y vinculada al plan del cliente exitosamente!');
        this.aiRecommendations.update((curr) => {
          if (!curr) return null;
          return {
            ...curr,
            recommendations: curr.recommendations.map((r) =>
              r.recipe_id === recipeId ? { ...r, already_assigned: true } : r
            ),
          };
        });
        setTimeout(() => this.aiAssignSuccess.set(null), 4000);
      },
      error: (err: any) => {
        this.aiError.set(err?.error?.detail || 'Error al asignar la receta al paciente');
        setTimeout(() => this.aiError.set(null), 4000);
      },
    });
  }

  // ==========================================
  // MÓDULO DE REPORTES DINÁMICOS
  // ==========================================
  loadReportConfig(): void {
    this.reportService.getEntities().subscribe({
      next: (entities) => {
        if (entities.length > 0) {
          const current = this.selectedReportEntity();
          const target = entities.find((e) => e.entity === current) ? current : entities[0].entity;
          this.onReportEntityChange(target);
        }
      },
    });
  }

  onReportEntityChange(entityKey: string): void {
    this.selectedReportEntity.set(entityKey);
    const ent = this.reportService.entities().find((e) => e.entity === entityKey);
    if (ent) {
      this.selectedReportColumns.set(ent.available_columns.map((c) => c.key));
    } else {
      this.selectedReportColumns.set([]);
    }
    this.reportPreviewData.set(null);
  }

  toggleReportColumn(colKey: string): void {
    this.selectedReportColumns.update((cols) => {
      if (cols.includes(colKey)) {
        return cols.filter((c) => c !== colKey);
      } else {
        return [...cols, colKey];
      }
    });
  }

  selectAllReportColumns(): void {
    const ent = this.reportService.entities().find((e) => e.entity === this.selectedReportEntity());
    if (ent) {
      this.selectedReportColumns.set(ent.available_columns.map((c) => c.key));
    }
  }

  deselectAllReportColumns(): void {
    this.selectedReportColumns.set([]);
  }

  generateReportPreview(): void {
    const req = {
      entity: this.selectedReportEntity(),
      columns: this.selectedReportColumns(),
      start_date: this.reportStartDate() || undefined,
      end_date: this.reportEndDate() || undefined,
      status: this.reportStatusFilter() || undefined,
      search: this.reportSearch() || undefined,
      limit: 200,
    };
    this.isLoadingReport.set(true);
    this.reportError.set(null);
    this.reportService.queryReport(req).subscribe({
      next: (res) => {
        this.reportPreviewData.set(res);
        this.isLoadingReport.set(false);
      },
      error: (err: any) => {
        this.reportError.set(err?.error?.detail || 'Error al generar vista previa');
        this.isLoadingReport.set(false);
      },
    });
  }

  exportReportExcel(): void {
    const req = {
      entity: this.selectedReportEntity(),
      columns: this.selectedReportColumns(),
      start_date: this.reportStartDate() || undefined,
      end_date: this.reportEndDate() || undefined,
      status: this.reportStatusFilter() || undefined,
      search: this.reportSearch() || undefined,
      limit: 500,
    };
    this.isExportingReport.set(true);
    this.reportService.exportExcel(req).subscribe({
      next: (blob) => {
        const filename = `reporte_${this.selectedReportEntity()}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        this.reportService.downloadBlob(blob, filename);
        this.isExportingReport.set(false);
        this.reportMessage.set('Reporte Excel descargado exitosamente.');
        setTimeout(() => this.reportMessage.set(null), 3500);
      },
      error: () => {
        this.isExportingReport.set(false);
        this.reportError.set('Error al descargar archivo Excel.');
        setTimeout(() => this.reportError.set(null), 3500);
      },
    });
  }

  exportReportPdf(): void {
    const req = {
      entity: this.selectedReportEntity(),
      columns: this.selectedReportColumns(),
      start_date: this.reportStartDate() || undefined,
      end_date: this.reportEndDate() || undefined,
      status: this.reportStatusFilter() || undefined,
      search: this.reportSearch() || undefined,
      limit: 500,
    };
    this.isExportingReport.set(true);
    this.reportService.exportPdf(req).subscribe({
      next: (blob) => {
        const filename = `reporte_${this.selectedReportEntity()}_${new Date().toISOString().slice(0, 10)}.pdf`;
        this.reportService.downloadBlob(blob, filename);
        this.isExportingReport.set(false);
        this.reportMessage.set('Reporte PDF descargado exitosamente.');
        setTimeout(() => this.reportMessage.set(null), 3500);
      },
      error: () => {
        this.isExportingReport.set(false);
        this.reportError.set('Error al exportar a PDF.');
        setTimeout(() => this.reportError.set(null), 3500);
      },
    });
  }

  // ==========================================
  // MÓDULO DE COPIAS DE SEGURIDAD (BACKUP)
  // ==========================================
  loadBackupData(): void {
    this.backupService.getSettings().subscribe({
      next: (s) => {
        this.backupForm.patchValue({
          auto_backup_enabled: s.auto_backup_enabled,
          frequency_hours: s.frequency_hours,
          retention_days: s.retention_days,
        });
      },
    });
    this.backupService.getHistory().subscribe();
  }

  saveBackupSettings(): void {
    this.backupService.updateSettings(this.backupForm.value).subscribe({
      next: () => {
        this.backupSuccess.set('Configuración de copias de seguridad actualizada.');
        setTimeout(() => this.backupSuccess.set(null), 3500);
      },
      error: (err: any) => {
        this.backupError.set(err?.error?.detail || 'Error al guardar configuración');
        setTimeout(() => this.backupError.set(null), 3500);
      },
    });
  }

  createManualBackup(): void {
    this.backupService.exportManual().subscribe({
      next: (log) => {
        this.backupSuccess.set(`Copia de seguridad manual generada: ${log.filename} (${log.file_size_bytes} bytes).`);
        setTimeout(() => this.backupSuccess.set(null), 4000);
      },
      error: (err: any) => {
        this.backupError.set(err?.error?.detail || 'Error al generar la copia de seguridad manual');
        setTimeout(() => this.backupError.set(null), 4000);
      },
    });
  }

  downloadBackup(filename: string): void {
    this.backupService.downloadBackup(filename);
  }

  onBackupFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedRestoreFile = file;
      this.restoreModalOpen.set(true);
    }
  }

  closeRestoreModal(): void {
    this.restoreModalOpen.set(false);
    this.selectedRestoreFile = null;
  }

  executeRestore(): void {
    if (!this.selectedRestoreFile) return;
    this.isRestoringBackup.set(true);
    this.backupService.restoreBackup(this.selectedRestoreFile).subscribe({
      next: (res) => {
        this.isRestoringBackup.set(false);
        this.backupSuccess.set(res.message);
        this.closeRestoreModal();
        setTimeout(() => this.backupSuccess.set(null), 5000);
      },
      error: (err: any) => {
        this.isRestoringBackup.set(false);
        this.backupError.set(err?.error?.detail || 'Error durante la restauración del sistema');
        setTimeout(() => this.backupError.set(null), 4000);
      },
    });
  }
}


