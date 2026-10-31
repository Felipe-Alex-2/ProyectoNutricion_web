import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { AVATAR_PRESETS, UserAvatarComponent } from './user-avatar.component';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const OUTPUT_SIZE = 256;

/** Selector de avatar: 3 predeterminados + importar imagen propia (se recorta y reduce a 256 px). */
@Component({
  selector: 'ns-avatar-picker',
  imports: [UserAvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="picker">
      <ns-user-avatar class="current" [avatar]="value()" [name]="name()" />
      <div class="options" role="radiogroup" aria-label="Elige tu avatar">
        @for (p of presets; track p.id) {
          <button
            type="button"
            class="opt"
            role="radio"
            [class.selected]="value() === 'preset:' + p.id"
            [attr.aria-checked]="value() === 'preset:' + p.id"
            [attr.aria-label]="p.label"
            [title]="p.label"
            (click)="choose('preset:' + p.id)"
          >
            <ns-user-avatar [avatar]="'preset:' + p.id" [name]="p.label" />
          </button>
        }
        <label class="opt upload" title="Importar una imagen">
          <span aria-hidden="true">＋</span>
          <span class="sr">Importar imagen</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" (change)="onFile($event)" />
        </label>
      </div>
      <div class="actions">
        <small>Elige uno o importa tu foto (PNG, JPG o WEBP).</small>
        @if (value()) {
          <button type="button" class="link" (click)="choose('')">Quitar avatar</button>
        }
      </div>
      @if (error()) {
        <small class="err" role="alert">{{ error() }}</small>
      }
    </div>
  `,
  styles: [
    `
      .picker {
        display: grid;
        gap: 12px;
        justify-items: start;
      }
      .current {
        --avatar-size: 88px;
      }
      .options {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        align-items: center;
      }
      .opt {
        --avatar-size: 56px;
        width: 62px;
        height: 62px;
        padding: 2px;
        border-radius: 50%;
        border: 3px solid transparent;
        background: transparent;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .opt:hover {
        border-color: rgba(8, 127, 117, 0.35);
      }
      .opt.selected {
        border-color: #087f75;
      }
      .opt:focus-visible,
      .upload:focus-within {
        outline: 3px solid #087f75;
        outline-offset: 2px;
      }
      .upload {
        border: 2px dashed #8aa6a3;
        font-size: 26px;
        color: #087f75;
        position: relative;
      }
      .upload input {
        position: absolute;
        inset: 0;
        opacity: 0;
        cursor: pointer;
        width: 100%;
        height: 100%;
      }
      .sr {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
      }
      .actions {
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
      }
      .link {
        background: none;
        border: 0;
        color: #087f75;
        text-decoration: underline;
        cursor: pointer;
        padding: 0;
        font: inherit;
      }
      .err {
        color: #b3261e;
      }
    `,
  ],
})
export class AvatarPickerComponent {
  readonly value = input<string>('');
  readonly name = input<string>('');
  readonly valueChange = output<string>();

  readonly presets = AVATAR_PRESETS;
  readonly error = signal('');

  choose(value: string): void {
    this.error.set('');
    this.valueChange.emit(value);
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      this.error.set('Formato no admitido. Usa PNG, JPG o WEBP.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      this.error.set('La imagen es muy pesada (máximo 5 MB).');
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        this.error.set('No se pudo procesar la imagen.');
        return;
      }
      ctx.drawImage(
        img,
        (img.width - side) / 2,
        (img.height - side) / 2,
        side,
        side,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE,
      );
      this.choose(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      this.error.set('No se pudo leer la imagen.');
    };
    img.src = url;
  }
}

