import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export const AVATAR_PRESETS = [
  { id: 'hombre-lentes', label: 'Hombre con lentes' },
  { id: 'hombre', label: 'Hombre sin lentes' },
  { id: 'mujer', label: 'Mujer' },
] as const;

/** Muestra el avatar del usuario: predeterminado ("preset:<id>"), imagen subida (data URL) o su inicial. */
@Component({
  selector: 'ns-user-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (preset(); as p) {
      <svg viewBox="0 0 100 100" role="img" [attr.aria-label]="name() || 'Avatar'">
        <defs>
          <clipPath id="avatar-clip-{{ p }}"><circle cx="50" cy="50" r="50" /></clipPath>
        </defs>
        <g [attr.clip-path]="'url(#avatar-clip-' + p + ')'">
          @switch (p) {
            @case ('mujer') {
              <rect width="100" height="100" fill="#f6d9e0" />
              <path d="M22 100c2-22 14-30 28-30s26 8 28 30z" fill="#7a5aa6" />
              <path
                d="M26 52c-4-30 10-42 24-42s28 12 24 42c-1 14 3 24 6 30H20c3-6 7-16 6-30z"
                fill="#4a2f24"
              />
              <rect x="43" y="58" width="14" height="16" rx="6" fill="#e9b894" />
              <ellipse cx="50" cy="46" rx="16" ry="19" fill="#f1c9a5" />
              <path
                d="M33 44c2-14 10-20 19-20 8 0 14 5 15 14-8-3-18-9-24-14-3 6-6 14-10 20z"
                fill="#4a2f24"
              />
              <circle cx="44" cy="48" r="1.8" fill="#2b2e34" />
              <circle cx="56" cy="48" r="1.8" fill="#2b2e34" />
              <path
                d="M45 56q5 4 10 0"
                stroke="#b5524a"
                stroke-width="2"
                fill="none"
                stroke-linecap="round"
              />
            }
            @default {
              <rect width="100" height="100" fill="#cfe8e4" />
              <path d="M18 100c2-22 14-30 32-30s30 8 32 30z" fill="#087f75" />
              <rect x="43" y="58" width="14" height="16" rx="6" fill="#e0ab85" />
              <ellipse cx="50" cy="46" rx="17" ry="20" fill="#f1c9a5" />
              <path
                d="M32 44c-2-18 8-26 19-26s21 8 17 28c-2-8-6-12-10-13-8 3-18 3-26 11z"
                fill="#2f2a26"
              />
              <circle cx="43" cy="48" r="1.8" fill="#2b2e34" />
              <circle cx="57" cy="48" r="1.8" fill="#2b2e34" />
              <path
                d="M45 57q5 3.5 10 0"
                stroke="#9a5a4a"
                stroke-width="2"
                fill="none"
                stroke-linecap="round"
              />
              @if (p === 'hombre-lentes') {
                <g fill="rgba(255,255,255,.35)" stroke="#1f2328" stroke-width="2">
                  <circle cx="42" cy="48" r="7" />
                  <circle cx="58" cy="48" r="7" />
                </g>
                <path
                  d="M49 48h2M35 47l-4-2M65 47l4-2"
                  stroke="#1f2328"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              }
            }
          }
        </g>
      </svg>
    } @else if (image(); as src) {
      <img [src]="src" [alt]="name() || 'Avatar'" />
    } @else {
      <span class="initial" aria-hidden="true">{{ initial() }}</span>
    }
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--avatar-size, 40px);
        height: var(--avatar-size, 40px);
        border-radius: 50%;
        overflow: hidden;
        flex: none;
        background: #087f75;
        color: #fff;
        font-weight: 700;
      }
      svg,
      img {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
      }
      .initial {
        font-size: calc(var(--avatar-size, 40px) * 0.45);
        line-height: 1;
      }
    `,
  ],
})
export class UserAvatarComponent {
  readonly avatar = input<string | null | undefined>(null);
  readonly name = input<string | null | undefined>('');

  readonly preset = computed(() => {
    const value = this.avatar() ?? '';
    const id = value.startsWith('preset:') ? value.slice(7) : '';
    return AVATAR_PRESETS.some((p) => p.id === id) ? id : null;
  });
  readonly image = computed(() => {
    const value = this.avatar() ?? '';
    return value.startsWith('data:image/') ? value : null;
  });
  readonly initial = computed(() => (this.name() || '?').trim().charAt(0).toUpperCase());
}
