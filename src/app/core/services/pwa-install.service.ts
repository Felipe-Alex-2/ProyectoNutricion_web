import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private readonly browser = inject(DOCUMENT).defaultView;
  private readonly destroyRef = inject(DestroyRef);
  private pendingPrompt: InstallPromptEvent | null = null;
  readonly canInstall = signal(false);
  readonly installing = signal(false);
  readonly dismissed = signal(false);
  readonly installed = signal(false);
  readonly ios = signal(false);
  readonly error = signal('');
  readonly visible = computed(() => !this.installed() && !this.dismissed() && (this.canInstall() || this.ios()));

  constructor() {
    const browser = this.browser;
    if (!browser) return;
    const media = browser.matchMedia?.('(display-mode: standalone)');
    const navigator = browser.navigator as Navigator & { standalone?: boolean };
    this.installed.set(!!media?.matches || navigator.standalone === true);
    this.ios.set(/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      this.pendingPrompt = event as InstallPromptEvent;
      this.canInstall.set(true);
    };
    const markInstalled = () => {
      this.installed.set(true);
      this.canInstall.set(false);
      this.pendingPrompt = null;
    };
    const displayChanged = (event: MediaQueryListEvent) => this.installed.set(event.matches);
    browser.addEventListener('beforeinstallprompt', beforeInstall);
    browser.addEventListener('appinstalled', markInstalled);
    media?.addEventListener('change', displayChanged);
    this.destroyRef.onDestroy(() => {
      browser.removeEventListener('beforeinstallprompt', beforeInstall);
      browser.removeEventListener('appinstalled', markInstalled);
      media?.removeEventListener('change', displayChanged);
    });
  }

  dismiss(): void { this.dismissed.set(true); }

  async install(): Promise<void> {
    const event = this.pendingPrompt;
    if (!event || this.installing()) return;
    this.pendingPrompt = null;
    this.canInstall.set(false);
    this.installing.set(true);
    this.error.set('');
    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === 'accepted') this.installed.set(true);
    } catch {
      this.error.set('No se pudo abrir la instalación. Inténtalo desde el menú del navegador.');
    } finally {
      this.installing.set(false);
    }
  }
}
