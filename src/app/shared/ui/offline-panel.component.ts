import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { OfflineService } from '../../core/services/offline.service';

@Component({
  selector: 'ns-offline-panel',
  standalone: true,
  imports: [DatePipe],
  template: ` <section class="offline-panel" aria-label="Copia sin conexión">
    <div class="status" role="status" aria-live="polite">
      <strong>{{
        offline.store.offline() ? 'Modo sin conexión' : 'Copia para usar sin conexión'
      }}</strong>
      <span>{{ offline.store.pending().length }} operaciones pendientes</span>
      <span
        >Última copia:
        {{
          (offline.lastCopy() | date: 'dd/MM/yyyy HH:mm') || 'Todavía no hay una copia completa'
        }}</span
      >
    </div>
    <div class="actions">
      <button type="button" (click)="offline.copy()" [disabled]="offline.copying()">
        {{ offline.copying() ? 'Copiando…' : 'Copiar ahora' }}
      </button>
      <button
        type="button"
        (click)="offline.sync()"
        [disabled]="offline.syncing() || offline.store.offline()"
      >
        {{ offline.syncing() ? 'Sincronizando…' : 'Sincronizar pendientes' }}
      </button>
    </div>
    @if (offline.message()) {
      <p role="status">{{ offline.message() }}</p>
    }
    @if (offline.store.offline()) {
      <p>
        Consulta la información descargada. Puedes guardar recetas y cobros en efectivo pendientes.
        PayPal y los cambios clínicos requieren internet.
      </p>
    }
    @if (offline.store.pending().length) {
      <details>
        <summary>Ver operaciones pendientes</summary>
        <ol>
          @for (entry of offline.store.pending(); track entry.id) {
            <li>
              <strong>{{
                entry.url.endsWith('/recipes')
                  ? 'Receta: ' + entry.body.title
                  : 'Efectivo: ' + entry.body.customer_name + ' · ' + entry.body.amount + ' USD'
              }}</strong>
              <span
                >{{ entry.error || 'Pendiente de enviar al servidor' }} ·
                {{ entry.created | date: 'dd/MM HH:mm' }}</span
              >
              @if (entry.blocked) {
                <button type="button" (click)="offline.retry(entry)">Reintentar</button>
              }
              <button type="button" (click)="offline.discard(entry)">Descartar</button>
            </li>
          }
        </ol>
      </details>
    }
  </section>`,
  styles: [
    `
      :host {
        display: block;
        margin: 12px 0;
      }
      .offline-panel {
        background: var(--surface, #eef6f1);
        color: var(--text-primary, #19392b);
        border: 1px solid #a8cbb8;
        border-radius: 14px;
        padding: 14px;
      }
      .status,
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
      }
      .actions {
        margin-top: 10px;
      }
      span {
        font-size: 0.85rem;
      }
      button {
        font: inherit;
        padding: 8px 12px;
        border-radius: 8px;
        border: 1px solid #8db39e;
        background: transparent;
        color: inherit;
        cursor: pointer;
      }
      button:disabled {
        opacity: 0.55;
        cursor: default;
      }
      li {
        padding: 8px 0;
      }
      li span {
        display: block;
      }
      p {
        font-size: 0.85rem;
        margin: 10px 0 0;
      }
      summary {
        cursor: pointer;
        margin-top: 12px;
      }
    `,
  ],
})
export class OfflinePanelComponent {
  readonly offline = inject(OfflineService);
}
