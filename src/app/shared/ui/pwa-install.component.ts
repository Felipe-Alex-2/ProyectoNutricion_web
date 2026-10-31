import { Component, inject } from '@angular/core';
import { PwaInstallService } from '../../core/services/pwa-install.service';

@Component({
  selector: 'app-pwa-install',
  template: `
    @if (pwa.visible() || pwa.installing() || pwa.error()) {
      <aside class="install" aria-label="Instalar NutriSalud">
        <img src="icons/nutrisalud-192.png" width="44" height="44" alt="" />
        <div class="copy">
          <strong>NutriSalud, siempre a mano</strong>
          @if (pwa.canInstall() || pwa.installing()) {
            <p>Instala tu espacio de nutrición en este dispositivo.</p>
          } @else if (pwa.ios() && !pwa.error()) {
            <p>En Safari, toca Compartir y luego “Añadir a pantalla de inicio”.</p>
          }
          <p role="status">{{ pwa.error() }}</p>
        </div>
        @if (pwa.canInstall() || pwa.installing()) {
          <button type="button" class="install-button" (click)="pwa.install()"
            [disabled]="pwa.installing()" [attr.aria-busy]="pwa.installing()">
            {{ pwa.installing() ? 'Instalando…' : 'Instalar NutriSalud' }}
          </button>
        }
        <button type="button" class="dismiss" aria-label="Cerrar aviso de instalación"
          (click)="close()">×</button>
      </aside>
    }
  `,
  styles: `
    :host { display: block; }
    .install { display: flex; align-items: center; gap: 16px; padding: 12px max(16px, env(safe-area-inset-right)) 12px max(16px, env(safe-area-inset-left)); background: var(--bg-card); color: var(--text-primary); border-bottom: 1px solid var(--border-color); font-size: 14px; }
    img { border-radius: 12px; flex: 0 0 auto; }
    .copy { flex: 1; min-width: 0; }
    strong { font-size: 14px; }
    p { margin: 4px 0 0; line-height: 1.5; color: var(--text-secondary); }
    p:empty { display: none; }
    button { min-height: 44px; cursor: pointer; font: inherit; font-weight: 700; border-radius: 12px; }
    button:focus-visible { outline: 3px solid var(--color-primary); outline-offset: 3px; }
    .install-button { background: var(--color-primary); color: var(--bg-card); border: 0; padding: 10px 16px; }
    .install-button:disabled { opacity: .7; cursor: wait; }
    .dismiss { background: transparent; color: var(--text-secondary); border: 0; min-width: 44px; font-size: 24px; }
    @media (max-width: 540px) {
      .install { gap: 10px; flex-wrap: wrap; }
      .copy { flex-basis: calc(100% - 110px); }
      .install-button { margin-left: 54px; flex: 1; order: 4; }
    }
  `,
})
export class PwaInstallComponent {
  readonly pwa = inject(PwaInstallService);
  close(): void {
    this.pwa.error.set('');
    this.pwa.dismiss();
  }
}
