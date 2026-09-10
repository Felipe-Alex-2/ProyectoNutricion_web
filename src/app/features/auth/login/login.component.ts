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
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage = signal<string | null>(null);
  showPassword = signal<boolean>(false);

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    public themeService: ThemeService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, passwordComplexityValidator]],
    });
  }

  togglePassword(): void {
    this.showPassword.update((val) => !val);
  }

  onSubmit(): void {
    const emailControl = this.loginForm.get('email');
    const passwordControl = this.loginForm.get('password');

    const emailValue = emailControl?.value ? String(emailControl.value).trim() : '';
    const passwordValue = passwordControl?.value ? String(passwordControl.value) : '';

    // Si algún campo está vacío al intentar iniciar sesión
    if (!emailValue || !passwordValue) {
      this.loginForm.markAllAsTouched();
      this.errorMessage.set('Por favor, rellene todos los campos para iniciar sesión.');
      return;
    }

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      if (emailControl?.hasError('email')) {
        this.errorMessage.set('Por favor, ingrese un correo electrónico válido.');
      } else if (passwordControl?.hasError('passwordComplexity')) {
        this.errorMessage.set(
          'La contraseña debe tener al menos 8 caracteres, una letra mayúscula, una minúscula, un número y un carácter especial.'
        );
      } else {
        this.errorMessage.set('Por favor, verifique los datos ingresados.');
      }
      return;
    }

    this.errorMessage.set(null);
    const { email, password } = this.loginForm.value;

    this.authService.login({ email: email.trim(), password }).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        const detail = err?.error?.detail;
        if (typeof detail === 'string') {
          this.errorMessage.set(detail);
        } else if (Array.isArray(err?.error?.errors)) {
          this.errorMessage.set(err.error.errors[0]?.message || 'Datos inválidos');
        } else {
          this.errorMessage.set('Error de autenticación. Verifica tus credenciales.');
        }
      },
    });
  }
}

