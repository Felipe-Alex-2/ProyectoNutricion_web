import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthShellComponent } from '../auth-shell.component';
import { IconComponent } from '../../../shared/ui/icon.component';
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

export function passwordComplexityValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;

  const hasMinLength = value.length >= 8;
  const hasUpperCase = /[A-Z]/.test(value);
  const hasLowerCase = /[a-z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  const hasSpecial = /[^A-Za-z0-9]/.test(value);

  const isValid = hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecial;
  if (!isValid) {
    return {
      passwordComplexity: {
        hasMinLength,
        hasUpperCase,
        hasLowerCase,
        hasNumber,
        hasSpecial,
      },
    };
  }
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AuthShellComponent, IconComponent],
  templateUrl: './register.component.html',
  styleUrls: ['../auth-form.css'],
})
export class RegisterComponent {
  companies = signal<{id:string;name:string}[]>([]);
  branches = signal<{id:string;name:string}[]>([]);
  registerForm: FormGroup;
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  showPassword = signal<boolean>(false);

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    public themeService: ThemeService,
    private http: HttpClient,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      tenant_id: ['', Validators.required],
      branch_id: ['', Validators.required],
      full_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(250)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, passwordComplexityValidator]],
      confirmPassword: ['', [Validators.required]],
    }, { validators: this.passwordMatchValidator });
    this.http.get<{id:string;name:string}[]>(`${environment.apiUrl}/tenants/public`).subscribe({next: rows=>this.companies.set(rows),error:()=>this.errorMessage.set('No se pudieron cargar las empresas. Intenta nuevamente.')});
    this.registerForm.get('tenant_id')!.valueChanges.subscribe(id=>{
      this.branches.set([]); this.registerForm.patchValue({branch_id:''});
      if(id) this.http.get<{id:string;name:string}[]>(`${environment.apiUrl}/branches/public`,{params:{tenant_id:id}}).subscribe({next: rows=>{ if(this.registerForm.value.tenant_id !== id)return; this.branches.set(rows); if(rows.length===1)this.registerForm.patchValue({branch_id:rows[0].id}); },error:()=>this.errorMessage.set('No se pudieron cargar las sucursales.')});
    });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null
      : { mismatch: true };
  }

  get passwordRequirements() {
    const value = String(this.registerForm.get('password')?.value || '');
    return [
      {label:'8 caracteres como mínimo',met:value.length >= 8},
      {label:'Una letra mayúscula',met:/[A-Z]/.test(value)},
      {label:'Una letra minúscula',met:/[a-z]/.test(value)},
      {label:'Un número',met:/[0-9]/.test(value)},
      {label:'Un símbolo',met:/[^A-Za-z0-9]/.test(value)},
    ];
  }

  togglePassword(): void {
    this.showPassword.update((val) => !val);
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    const { email, password, full_name, tenant_id, branch_id } = this.registerForm.value;

    this.authService.register({ email, password, full_name, tenant_id, branch_id }).subscribe({
      next: () => {
        this.successMessage.set('¡Cuenta creada exitosamente! Iniciando sesión...');
        // Auto login
        this.authService.login({ email, password }).subscribe({
          next: () => {
            setTimeout(() => this.router.navigate(['/dashboard']), 800);
          },
          error: () => {
            this.router.navigate(['/login']);
          }
        });
      },
      error: (err) => {
        const detail = err?.error?.detail;
        if (typeof detail === 'string') {
          this.errorMessage.set(detail);
        } else if (Array.isArray(err?.error?.errors)) {
          this.errorMessage.set(err.error.errors[0]?.message || 'Datos inválidos');
        } else {
          this.errorMessage.set('Error al registrar usuario. Intenta con otro correo.');
        }
      },
    });
  }
}
