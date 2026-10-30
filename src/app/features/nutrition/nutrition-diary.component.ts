import { Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { PatientService } from '../../core/services/patient.service';
import { PatientListItem } from '../../core/models/user.model';
import { environment } from '../../../environments/environment';

interface FoodRecord {
  id: string;
  notes: string;
  created_at: string;
  estimated_calories: number;
  estimated_protein: number;
  estimated_carbs: number;
  estimated_fats: number;
  details?: { consumed_at?: string };
}
interface Analysis {
  total: { calorias: number; proteinas_g: number; carbohidratos_g: number; grasas_g: number };
  alimentos: { nombre: string; porcion_aprox_g: number; calorias: number }[];
  observaciones: string;
}

@Component({
  selector: 'app-nutrition-diary',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './nutrition-diary.component.html',
  styleUrl: './nutrition-diary.component.css',
})
export class NutritionDiaryComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly patientsApi = inject(PatientService);
  private readonly destroy = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly api = environment.apiUrl;
  readonly staff = computed(() =>
    ['NUTRICIONISTA', 'ADMIN_ORGANIZATION', 'SUPERADMIN'].includes(
      this.auth.currentUser()?.role_id ?? '',
    ),
  );
  readonly patients = signal<PatientListItem[]>([]);
  readonly patientId = signal('');
  readonly records = signal<FoodRecord[]>([]);
  readonly analysis = signal<Analysis | null>(null);
  readonly busy = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly preview = signal('');
  private photo: File | null = null;
  private historyVersion = 0;
  private searchVersion = 0;
  private pendingId: string | null = null;
  private pendingBody: string | null = null;
  readonly form = this.fb.nonNullable.group({
    description: ['', [Validators.required, Validators.maxLength(500), Validators.pattern(/\S/)]],
    meal_type: ['Almuerzo', Validators.required],
    consumed_at: [this.localNow(), Validators.required],
    calories: [0, [Validators.required, Validators.min(0), Validators.max(10000)]],
    protein_g: [0, [Validators.required, Validators.min(0), Validators.max(1000)]],
    carbs_g: [0, [Validators.required, Validators.min(0), Validators.max(1000)]],
    fats_g: [0, [Validators.required, Validators.min(0), Validators.max(1000)]],
  });

  private localNow(): string {
    const date = new Date();
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
  ngOnInit(): void {
    this.loadHistory();
    if (this.staff()) this.searchPatients('');
  }
  searchPatients(search: string): void {
    const version = ++this.searchVersion;
    this.patientsApi
      .searchPatients(search)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (p) => {
          if (version === this.searchVersion) this.patients.set(p);
        },
        error: () => this.error.set('No se pudo cargar la lista de pacientes.'),
      });
  }
  selectPatient(id: string): void {
    this.patientId.set(id);
    this.analysis.set(null);
    this.records.set([]);
    this.error.set('');
    this.success.set('');
    this.loadHistory();
  }
  loadHistory(): void {
    const version = ++this.historyVersion;
    this.loading.set(true);
    let params = new HttpParams();
    if (this.patientId()) params = params.set('patient_id', this.patientId());
    this.http
      .get<FoodRecord[]>(`${this.api}/food/history`, { params })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          if (version === this.historyVersion) {
            this.records.set(r);
            this.loading.set(false);
          }
        },
        error: () => {
          if (version === this.historyVersion) {
            this.error.set('No se pudo consultar el historial.');
            this.loading.set(false);
          }
        },
      });
  }
  choosePhoto(event: Event): void {
    this.clearPhoto();
    this.error.set('');
    this.analysis.set(null);
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 10 * 1024 * 1024 ||
      file.size === 0
    ) {
      this.error.set('Selecciona una imagen JPG, PNG o WebP de hasta 10 MB.');
      input.value = '';
      return;
    }
    this.photo = file;
    this.preview.set(URL.createObjectURL(file));
  }
  analyzePhoto(): void {
    if (!this.photo || this.busy()) return;
    const body = new FormData();
    body.append('file', this.photo);
    if (this.patientId()) body.append('patient_id', this.patientId());
    this.busy.set(true);
    this.error.set('');
    this.success.set('');
    this.http
      .post<Analysis>(`${this.api}/food/analyze`, body)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (a) => {
          this.analysis.set(a);
          this.busy.set(false);
          this.success.set('Fotografía analizada y registrada.');
          this.loadHistory();
        },
        error: (e) => {
          this.error.set(
            e.error?.detail ||
              'No se pudo analizar la foto. Intenta de nuevo o registra tu comida manualmente.',
          );
          this.busy.set(false);
        },
      });
  }
  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy() || this.patientId()) return;
    const raw = this.form.getRawValue();
    const date = new Date(raw.consumed_at);
    if (Number.isNaN(date.getTime())) {
      this.error.set('Revisa la fecha de tu comida.');
      return;
    }
    const payload = {
      ...raw,
      description: raw.description.trim(),
      consumed_at: date.toISOString(),
    };
    const serialized = JSON.stringify(payload);
    if (serialized !== this.pendingBody) {
      this.pendingId = crypto.randomUUID();
      this.pendingBody = serialized;
    }
    this.busy.set(true);
    this.error.set('');
    this.success.set('');
    this.http
      .post(`${this.api}/food/records`, { ...payload, client_record_id: this.pendingId })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.pendingId = null;
          this.pendingBody = null;
          this.busy.set(false);
          this.form.reset({
            description: '',
            meal_type: 'Almuerzo',
            consumed_at: this.localNow(),
            calories: 0,
            protein_g: 0,
            carbs_g: 0,
            fats_g: 0,
          });
          this.success.set('Comida registrada correctamente.');
          this.loadHistory();
        },
        error: (e) => {
          this.error.set(
            e.error?.detail ||
              'No se pudo guardar. Reintenta con conexión. Para registrar sin internet utiliza la app móvil.',
          );
          this.busy.set(false);
        },
      });
  }
  private clearPhoto(): void {
    if (this.preview()) URL.revokeObjectURL(this.preview());
    this.preview.set('');
    this.photo = null;
  }
  ngOnDestroy(): void {
    this.clearPhoto();
  }
}
