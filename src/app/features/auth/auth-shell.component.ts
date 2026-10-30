import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/ui/icon.component';
import { AuthShowcaseComponent } from './auth-showcase.component';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [RouterLink, IconComponent, AuthShowcaseComponent],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <section class="auth-panel" aria-label="Acceso a NutriSalud">
          <header class="auth-header">
            <div class="auth-utilities">
              <a routerLink="/" class="back-link"><ns-icon name="back" />Volver al inicio</a>
              <button
                type="button"
                class="theme-button"
                (click)="theme.toggleTheme()"
                [attr.aria-label]="
                  theme.isDarkMode() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
                "
              >
                <ns-icon name="sun" />
              </button>
            </div>
            <a routerLink="/" class="ns-brand"
              ><span class="ns-brand-mark"><ns-icon name="leaf" /></span
              ><span>NutriSalud<small>NUTRICIÓN & BIENESTAR</small></span></a
            >
          </header>
          <nav class="auth-tabs" aria-label="Acceso a tu cuenta">
            <a
              routerLink="/login"
              [class.active]="mode() === 'login'"
              [attr.aria-current]="mode() === 'login' ? 'page' : null"
              >Iniciar sesión</a
            >
            <a
              routerLink="/register"
              [class.active]="mode() === 'register'"
              [attr.aria-current]="mode() === 'register' ? 'page' : null"
              >Crear cuenta</a
            >
          </nav>
          <div class="auth-content"><ng-content /></div>
          <footer class="auth-footer">
            <ns-icon name="shield" /><span
              >Tu espacio de bienestar empieza con un acceso seguro.</span
            >
          </footer>
        </section>
        <app-auth-showcase />
      </div>
      <p class="page-footer">Un día a la vez. Un hábito a la vez.</p>
    </div>
  `,
  styleUrl: './auth-shell.component.css',
})
export class AuthShellComponent {
  readonly theme = inject(ThemeService);
  readonly mode = input<'login' | 'register'>('login');
}
