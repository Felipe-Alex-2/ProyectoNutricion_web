import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, timer, switchMap, catchError, of } from 'rxjs';
import { IconComponent } from '../../shared/ui/icon.component';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { NotificationService } from '../../core/services/notification.service';
import { AppointmentService } from '../../core/services/appointment.service';
import { PatientLinkService } from '../../core/services/patient-link.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { Notification } from '../../core/models/notification.model';
import { Appointment, Nutritionist } from '../../core/models/appointment.model';
import { PatientLink } from '../../core/models/patient-link.model';
import { Recipe } from '../../core/models/recipe.model';
import {
  NutritionalPlanModel,
  MealItemModel,
  PatientAnamnesis,
} from '../../core/models/clinical.model';
import { Subscription, SubscriptionPlan } from '../../core/models/subscription.model';
import { environment } from '../../../environments/environment';
import { NutritionDiaryComponent } from '../nutrition/nutrition-diary.component';

interface DayMenu {
  day: string;
  meals: MealItemModel[];
  daily_calories: number;
}
interface WeeklyMenu {
  days: DayMenu[];
}
interface ChatMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
}
interface Receipt {
  id: string;
  plan_name: string;
  amount: number;
  currency: string;
  paid_at: string;
  is_sandbox: boolean;
}
interface FoodAnalysis {
  alimentos: { nombre: string; calorias: number; porcion_aprox_g: number }[];
  total: { calorias: number; proteinas_g: number; carbohidratos_g: number; grasas_g: number };
  observaciones: string;
  evaluacion?: { comparison_message: string; disclaimer: string };
}
interface FoodRecord {
  id: string;
  estimated_calories: number;
  created_at: string;
  notes?: string;
}

@Component({
  selector: 'app-client-portal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, IconComponent, NutritionDiaryComponent],
  templateUrl: './client-portal.component.html',
  styleUrl: './client-portal.component.css',
})
export class ClientPortalComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly notificationsApi = inject(NotificationService);
  private readonly appointmentsApi = inject(AppointmentService);
  private readonly linksApi = inject(PatientLinkService);
  private readonly subscriptionsApi = inject(SubscriptionService);
  private readonly api = environment.apiUrl;
  readonly tab = signal('inicio');
  readonly accountOpen = signal(false);
  readonly busy = signal('');
  readonly error = signal('');
  readonly success = signal('');
  readonly loading = signal<Record<string, boolean>>({});
  readonly loadErrors = signal<Record<string, string>>({});
  readonly notifications = signal<Notification[]>([]);
  readonly unread = signal(0);
  readonly appointments = signal<Appointment[]>([]);
  readonly nutritionists = signal<Nutritionist[]>([]);
  readonly link = signal<PatientLink | null>(null);
  readonly plan = signal<NutritionalPlanModel | null>(null);
  readonly recipes = signal<Recipe[]>([]);
  readonly selectedRecipe = signal<Recipe | null>(null);
  readonly weekly = signal<WeeklyMenu | null>(null);
  readonly dayIndex = signal(0);
  readonly anamnesis = signal<PatientAnamnesis | null>(null);
  readonly messages = signal<ChatMessage[]>([]);
  readonly analysis = signal<FoodAnalysis | null>(null);
  readonly foodHistory = signal<FoodRecord[]>([]);
  readonly photo = signal<File | null>(null);
  readonly subscription = signal<Subscription | null>(null);
  readonly plans = signal<SubscriptionPlan[]>([]);
  readonly receipts = signal<Receipt[]>([]);
  readonly nextAppointment = computed(
    () =>
      this.appointments()
        .filter((a) => a.status !== 'CANCELLED' && new Date(a.scheduled_at).getTime() >= Date.now())
        .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))[0],
  );
  readonly firstName = computed(() => this.auth.currentUser()?.full_name.split(' ')[0] || '');
  readonly navItems = [
    { id: 'inicio', label: 'Mi bienestar', icon: 'grid' },
    { id: 'plan', label: 'Mi plan', icon: 'leaf' },
    { id: 'foto', label: 'Mi alimentación', icon: 'camera' },
    { id: 'citas', label: 'Mis citas', icon: 'calendar' },
    { id: 'salud', label: 'Mi ficha', icon: 'file' },
    { id: 'asistente', label: 'Asistente IA', icon: 'sparkles' },
  ];
  readonly claimForm = this.fb.nonNullable.group({
    pairing_code: ['', [Validators.required, Validators.maxLength(20)]],
  });
  readonly appointmentForm = this.fb.nonNullable.group({
    nutritionist_id: ['', Validators.required],
    scheduled_at: ['', Validators.required],
    reason: ['', Validators.maxLength(500)],
  });
  readonly chatForm = this.fb.nonNullable.group({
    message: ['', [Validators.required, Validators.maxLength(1000)]],
  });
  readonly profileForm = this.fb.nonNullable.group({
    full_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(250)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
  });
  readonly healthForm = this.fb.group({
    birth_date: [''],
    gender: ['M', Validators.required],
    weight_kg: [
      null as number | null,
      [Validators.required, Validators.min(20), Validators.max(400)],
    ],
    height_cm: [
      null as number | null,
      [Validators.required, Validators.min(50), Validators.max(260)],
    ],
    target_weight_kg: [null as number | null, [Validators.min(20), Validators.max(400)]],
    target_weeks: [null as number | null, [Validators.min(1), Validators.max(104)]],
    pathologies: [''],
    allergies: [''],
    medications: [''],
    other_allergies: [''],
    other_pathologies: [''],
    water_intake_liters: [1.5, [Validators.required, Validators.min(0), Validators.max(10)]],
    alcohol_frequency: ['Nunca'],
    smoke_habit: ['No fuma'],
    coffee_cups: [1, [Validators.required, Validators.min(0), Validators.max(20)]],
    sleep_hours: [7, [Validators.required, Validators.min(1), Validators.max(24)]],
    fruits_vegetables_daily: [3, [Validators.required, Validators.min(0), Validators.max(20)]],
    sugary_drinks_weekly: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    meals_per_day: [4, [Validators.required, Validators.min(1), Validators.max(10)]],
    is_pregnant_or_lactating: [false],
    physical_activity: ['Ligero'],
    digestive_symptoms: [''],
    food_preferences: [''],
    goal: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    consent_data_processing: [false, Validators.requiredTrue],
  });
  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (user)
      this.profileForm.patchValue({
        full_name: user.full_name,
        email: user.email,
        phone: user.phone || '',
      });
    this.loadPersonalData();
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroy)).subscribe((p) => {
      const aliases: Record<string, string> = {
        principal: 'inicio',
        suscripcion: 'suscripcion',
        suscripciones: 'suscripcion',
        recetas: 'plan',
      };
      const requested = aliases[p['tab']] || p['tab'] || 'inicio';
      this.activate(requested);
    });
    timer(0, 15000)
      .pipe(
        switchMap(() => this.notificationsApi.getUnreadCount().pipe(catchError(() => of(null)))),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((c) => {
        if (c) this.unread.set(c.unread_count);
      });
  }
  private fetch<T>(key: string, source: Observable<T>, receive: (value: T) => void): void {
    this.loading.update((s) => ({ ...s, [key]: true }));
    this.loadErrors.update((s) => ({ ...s, [key]: '' }));
    source.pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (value) => {
        receive(value);
        this.loading.update((s) => ({ ...s, [key]: false }));
      },
      error: (err) => {
        this.loading.update((s) => ({ ...s, [key]: false }));
        this.loadErrors.update((s) => ({ ...s, [key]: this.errorText(err) }));
      },
    });
  }
  private execute<T>(key: string, source: Observable<T>, receive: (value: T) => void): void {
    if (this.busy()) return;
    const originTab = this.tab();
    this.busy.set(key);
    this.error.set('');
    this.success.set('');
    source.pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (value) => {
        this.busy.set('');
        if (this.tab() === originTab) receive(value);
      },
      error: (err) => {
        this.busy.set('');
        if (this.tab() === originTab) this.error.set(this.errorText(err));
      },
    });
  }
  private errorText(err: any): string {
    const detail = err?.error?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail))
      return 'Revisa los campos del formulario. Algunos datos no son válidos.';
    return 'No pudimos conectar con el servicio. Intenta de nuevo en unos momentos.';
  }
  private loadPersonalData(): void {
    this.fetch(
      'plan',
      this.http.get<NutritionalPlanModel | null>(`${this.api}/plans/my-plan`),
      (p) => this.plan.set(p),
    );
    this.fetch('citas', this.appointmentsApi.getAppointments('ALL'), (a) =>
      this.appointments.set(a),
    );
    this.fetch(
      'vinculo',
      this.http.get<PatientLink | null>(`${this.api}/patient-links/my-nutritionist`),
      (l) => this.link.set(l),
    );
    this.fetch(
      'salud',
      this.http.get<PatientAnamnesis | null>(`${this.api}/clinical/anamnesis/me`),
      (a) => {
        this.anamnesis.set(a);
        if (a) this.healthForm.patchValue({ ...a, birth_date: a.birth_date?.slice(0, 10) || '' });
      },
    );
  }
  go(tab: string): void {
    this.accountOpen.set(false);
    this.router.navigate(['/dashboard'], { queryParams: { tab } });
  }
  private activate(tab: string): void {
    const allowed = [
      ...this.navItems.map((n) => n.id),
      'notificaciones',
      'suscripcion',
      'perfil',
      'foto',
    ];
    this.tab.set(allowed.includes(tab) ? tab : 'inicio');
    this.error.set('');
    this.success.set('');
    this.selectedRecipe.set(null);
    if (tab === 'plan') {
      this.fetch('recetas', this.http.get<Recipe[]>(`${this.api}/recipes/my-plan`), (r) =>
        this.recipes.set(r),
      );
      this.fetch(
        'menu',
        this.http.get<WeeklyMenu | null>(`${this.api}/menu-semanal/current`),
        (m) => {
          this.weekly.set(m);
          this.dayIndex.set(0);
        },
      );
    }
    if (tab === 'citas') {
      this.fetch('citas', this.appointmentsApi.getAppointments('ALL'), (a) =>
        this.appointments.set(a),
      );
      this.fetch(
        'especialistas',
        this.appointmentsApi.getNutritionists(this.auth.currentUser()?.tenant_id || undefined),
        (n) => this.nutritionists.set(n),
      );
    }
    if (tab === 'notificaciones') this.refreshNotifications();
    if (tab === 'asistente')
      this.fetch(
        'chat',
        this.http.get<{ messages: ChatMessage[] }>(`${this.api}/chat/history`),
        (h) => this.messages.set(h.messages),
      );
    if (tab === 'suscripcion') {
      this.fetch('suscripcion', this.subscriptionsApi.getCurrentSubscription(), (s) =>
        this.subscription.set(s),
      );
      this.fetch('planes', this.subscriptionsApi.getPlans(), (p) =>
        this.plans.set(p.filter((x) => x.name.startsWith('CLIENTE'))),
      );
      this.fetch('recibos', this.http.get<Receipt[]>(`${this.api}/subscriptions/receipts`), (r) =>
        this.receipts.set(r),
      );
    }
  }
  claim(): void {
    if (this.claimForm.invalid) {
      this.claimForm.markAllAsTouched();
      return;
    }
    this.execute(
      'vinculo',
      this.linksApi.claimLink({ pairing_code: this.claimForm.getRawValue().pairing_code.trim() }),
      (l) => {
        this.link.set(l);
        this.success.set('Tu cuenta ya está vinculada con tu nutricionista.');
        this.auth.loadCurrentUser().pipe(takeUntilDestroyed(this.destroy)).subscribe();
        this.loadPersonalData();
      },
    );
  }
  saveHealth(): void {
    this.healthForm.markAllAsTouched();
    if (this.healthForm.invalid) {
      this.error.set('Revisa los campos señalados y confirma el consentimiento.');
      return;
    }
    const values = this.healthForm.getRawValue();
    this.execute(
      'salud',
      this.http.post<PatientAnamnesis>(`${this.api}/clinical/anamnesis/me`, {
        ...values,
        birth_date: values.birth_date ? `${values.birth_date}T00:00:00` : null,
      }),
      (a) => {
        this.anamnesis.set(a);
        this.success.set('Tu ficha de salud se guardó correctamente.');
      },
    );
  }
  schedule(): void {
    this.appointmentForm.markAllAsTouched();
    if (this.appointmentForm.invalid) return;
    const values = this.appointmentForm.getRawValue();
    const date = new Date(values.scheduled_at);
    if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) {
      this.error.set('Selecciona una fecha y hora futuras.');
      return;
    }
    this.execute(
      'cita',
      this.appointmentsApi.scheduleAppointment({
        ...values,
        scheduled_at: date.toISOString(),
        tenant_id: this.auth.currentUser()?.tenant_id,
      }),
      (a) => {
        this.appointments.update((list) => [a, ...list]);
        this.appointmentForm.reset();
        this.success.set('Solicitud enviada. Tu nutricionista confirmará la cita.');
      },
    );
  }
  cancelAppointment(a: Appointment): void {
    if (!window.confirm('¿Quieres cancelar esta cita?')) return;
    this.execute(
      'cancelar-cita',
      this.appointmentsApi.cancelAppointment(a.id, 'Cancelada por el paciente desde la web'),
      (updated) => {
        this.appointments.update((list) => list.map((x) => (x.id === a.id ? updated : x)));
        this.success.set('La cita fue cancelada.');
      },
    );
  }
  generateMenu(): void {
    this.execute(
      'menu',
      this.http.post<WeeklyMenu>(`${this.api}/menu-semanal/generate`, {
        patient_id: this.auth.currentUser()?.id,
      }),
      (m) => {
        this.weekly.set(m);
        this.dayIndex.set(0);
        this.success.set('Tu menú semanal está listo.');
      },
    );
  }
  sendMessage(): void {
    if (this.chatForm.invalid) return;
    const text = this.chatForm.getRawValue().message.trim();
    if (!text) return;
    this.execute(
      'chat',
      this.http.post<ChatMessage>(`${this.api}/chat`, { message: text }),
      (reply) => {
        this.messages.update((m) => [
          ...m,
          {
            id: `local-${Date.now()}`,
            role: 'user',
            content: text,
            created_at: new Date().toISOString(),
          },
          reply,
        ]);
        this.chatForm.reset();
      },
    );
  }
  clearChat(): void {
    if (!window.confirm('¿Quieres borrar tu historial de conversación?')) return;
    this.execute('borrar-chat', this.http.delete<void>(`${this.api}/chat/history`), () =>
      this.messages.set([]),
    );
  }
  choosePhoto(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.photo.set(null);
    this.analysis.set(null);
    if (!file) return;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      this.error.set('Selecciona una imagen JPG, PNG o WebP de hasta 10 MB.');
      return;
    }
    this.error.set('');
    this.photo.set(file);
  }
  analyzePhoto(): void {
    const photo = this.photo();
    if (!photo) return;
    const body = new FormData();
    body.append('file', photo);
    this.execute('foto', this.http.post<FoodAnalysis>(`${this.api}/food/analyze`, body), (a) => {
      this.analysis.set(a);
      this.fetch('fotos', this.http.get<FoodRecord[]>(`${this.api}/food/history`), (h) =>
        this.foodHistory.set(h),
      );
    });
  }
  refreshNotifications(): void {
    this.fetch('avisos', this.notificationsApi.getMyNotifications(), (n) =>
      this.notifications.set(n),
    );
  }
  markRead(n: Notification): void {
    if (n.is_read) return;
    this.execute('leer', this.notificationsApi.markAsRead(n.id), (u) => {
      this.notifications.update((list) => list.map((x) => (x.id === u.id ? u : x)));
      this.unread.update((c) => Math.max(0, c - 1));
    });
  }
  markAllRead(): void {
    this.execute('leer-todas', this.notificationsApi.markAllAsRead(), () => {
      this.notifications.update((list) => list.map((n) => ({ ...n, is_read: true })));
      this.unread.set(0);
    });
  }
  subscribe(plan: SubscriptionPlan): void {
    this.execute('pago', this.subscriptionsApi.createOrder(plan.name), (order) => {
      const url = new URL(order.approval_url);
      if (url.protocol !== 'https:') {
        this.error.set('No se recibió un enlace de pago válido.');
        return;
      }
      window.location.assign(url.href);
    });
  }
  cancelSubscription(): void {
    if (!window.confirm('¿Quieres cancelar tu suscripción?')) return;
    this.execute('cancelar-plan', this.subscriptionsApi.cancelSubscription(), (s) => {
      this.subscription.set(s);
      this.success.set('La suscripción fue cancelada.');
    });
  }
  downloadReceipt(receipt: Receipt): void {
    this.execute(
      'recibo',
      this.http.get(`${this.api}/subscriptions/receipts/${receipt.id}/pdf`, {
        responseType: 'blob',
      }),
      (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `NutriSalud-comprobante-${receipt.id}.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
    );
  }
  saveProfile(): void {
    this.profileForm.markAllAsTouched();
    if (this.profileForm.invalid) return;
    this.execute('perfil', this.auth.updateProfile(this.profileForm.getRawValue()), () =>
      this.success.set('Tu perfil se actualizó correctamente.'),
    );
  }
  status(status: string): string {
    return (
      (
        {
          PENDING: 'Pendiente',
          CONFIRMED: 'Confirmada',
          CANCELLED: 'Cancelada',
          ACTIVE: 'Activa',
          EXPIRED: 'Vencida',
        } as Record<string, string>
      )[status] || status
    );
  }
}
