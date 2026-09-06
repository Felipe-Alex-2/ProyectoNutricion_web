import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css'],
})
export class ResetPasswordComponent implements OnInit {
  resetForm: FormGroup;
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  showPassword = signal<boolean>(false);

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    public themeService: ThemeService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.resetForm = this.fb.group(
      {
        token: ['', [Validators.required]],
        new_password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  ngOnInit(): void {
    // Read token from URL query params (e.g. ?token=...)
    this.route.queryParams.subscribe((params) => {
      const token = params['token'];
      if (token) {
        this.resetForm.patchValue({ token });
      }
    });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('new_password')?.value === g.get('confirmPassword')?.value
      ? null
      : { mismatch: true };
  }

  togglePassword(): void {
    this.showPassword.update((val) => !val);
  }

  onSubmit(): void {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);

    const { token, new_password } = this.resetForm.value;

    this.authService.resetPassword(token, new_password).subscribe({
      next: (res) => {
        this.successMessage.set(
          res?.message || '¡Tu contraseña ha sido restablecida exitosamente! Redirigiendo a inicio de sesión...'
        );
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2200);
      },
      error: (err) => {
        const detail = err?.error?.detail;
        this.errorMessage.set(
          typeof detail === 'string'
            ? detail
            : 'Error al restablecer la contraseña. El enlace puede haber expirado (10 min de validez).'
        );
      },
    });
  }
}
