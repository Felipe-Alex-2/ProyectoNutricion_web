import { Injectable, signal, effect } from '@angular/core';

export type AppThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly THEME_KEY = 'nutrisalud_theme';
  
  // Signal para el modo oscuro
  isDarkMode = signal<boolean>(false);

  constructor() {
    this.initTheme();

    // Reaccionar a cambios en el signal para actualizar el DOM y localStorage
    effect(() => {
      const isDark = this.isDarkMode();
      this.applyTheme(isDark);
    });
  }

  private initTheme(): void {
    const saved = localStorage.getItem(this.THEME_KEY);
    if (saved) {
      this.isDarkMode.set(saved === 'dark');
    } else {
      // Por defecto modo claro como en el diseño de NutriSalud
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.isDarkMode.set(prefersDark);
    }
  }

  toggleTheme(): void {
    this.isDarkMode.update((dark) => !dark);
  }

  setTheme(mode: AppThemeMode): void {
    this.isDarkMode.set(mode === 'dark');
  }

  private applyTheme(isDark: boolean): void {
    localStorage.setItem(this.THEME_KEY, isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark-theme');
      document.body.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
      document.body.classList.remove('dark-theme');
    }
  }
}
