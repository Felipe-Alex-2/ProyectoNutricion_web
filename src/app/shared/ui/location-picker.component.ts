import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

let nextLocationId = 0;
export interface LocationOption {
  code: string;
  name: string;
}

@Component({
  selector: 'app-location-picker',
  standalone: true,
  template: `
    <label [for]="id">{{ label }}</label>
    <input
      [id]="id"
      [attr.list]="id + '-options'"
      [value]="text"
      [disabled]="disabled"
      (input)="search($event)"
      autocomplete="off"
      [attr.aria-describedby]="id + '-help'"
      placeholder="Escribe para buscar…"
    />
    <datalist [id]="id + '-options'">
      @for (option of options; track option.code) {
        <option [value]="option.name"></option>
      }
    </datalist>
    <small [id]="id + '-help'">{{
      disabled
        ? 'Selecciona primero el nivel anterior.'
        : 'Escribe y selecciona una opción de la lista.'
    }}</small>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: 0;
      }
      label {
        font-weight: 600;
      }
      input {
        box-sizing: border-box;
        width: 100%;
        min-height: 44px;
        padding: 10px;
        border: 1px solid var(--color-border, #ccdede);
        border-radius: 12px;
        background: var(--color-surface, #fff);
        color: inherit;
        font: inherit;
      }
      input:focus-visible {
        outline: 2px solid var(--color-primary, #087f77);
        outline-offset: 2px;
      }
      input:disabled {
        opacity: 0.65;
      }
      small {
        color: var(--text-secondary, #526970);
      }
    `,
  ],
})
export class LocationPickerComponent implements OnChanges {
  @Input() label = '';
  @Input() value = '';
  @Input() options: readonly LocationOption[] = [];
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<string>();
  readonly id = `location-${nextLocationId++}`;
  text = '';
  private emittedValue: string | undefined;
  ngOnChanges(changes: SimpleChanges) {
    if (changes['options'] || this.value !== this.emittedValue) {
      this.text = this.options.find((o) => o.code === this.value)?.name || '';
    }
    this.emittedValue = undefined;
  }
  search(event: Event) {
    this.text = (event.target as HTMLInputElement).value;
    const normalize = (s: string) =>
      s
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('es');
    const code = this.options.find((o) => normalize(o.name) === normalize(this.text))?.code || '';
    if (code !== this.value) {
      this.emittedValue = code;
      this.valueChange.emit(code);
    }
  }
}
