import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css'],
})
export class ForgotPasswordComponent {
  forgotForm: FormGroup;
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  submittedEmail = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    public themeService: ThemeService,
    private router: Router
  ) {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  onSubmit(): void {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    const email = this.forgotForm.value.email;

    this.authService.forgotPassword(email).subscribe({
      next: (res) => {
        this.submittedEmail.set(email);
        this.successMessage.set(
          res?.message ||
            'Si tu correo está registrado, recibirás un mensaje con las instrucciones y el token para restablecer tu contraseña (válido por 10 minutos).'
        );
      },
      error: (err) => {
        const detail = err?.error?.detail;
        this.errorMessage.set(
          typeof detail === 'string'
            ? detail
            : 'No se pudo procesar la solicitud. Por favor intenta de nuevo.'
        );
      },
    });
  }
}
