import { Component, computed, effect, input, output, signal } from '@angular/core';
import { IconComponent } from '../../shared/ui/icon.component';
import { staffPackagesForRole } from './staff-navigation.model';

@Component({
  selector: 'app-staff-navigation',
  standalone: true,
  imports: [IconComponent],
  template: `
    <nav aria-label="Paquetes del espacio de trabajo">
      @for (group of packages(); track group.id) {
        <section class="nav-package" [class.current]="isCurrent(group.id)">
          <button
            type="button"
            class="package-trigger"
            [attr.aria-expanded]="expanded().has(group.id)"
            [attr.aria-controls]="'package-' + group.id"
            (click)="toggle(group.id)"
          >
            <ns-icon [name]="group.icon" /><span>{{ group.label }}</span>
            @if (group.id === 'atencion' && pending() > 0) {
              <span class="pending-count" [attr.aria-label]="pending() + ' citas pendientes'">{{
                pending()
              }}</span>
            }
            <ns-icon
              class="package-chevron"
              name="chevron"
              [class.open]="expanded().has(group.id)"
            />
          </button>
          @if (expanded().has(group.id)) {
            <div class="package-items" [id]="'package-' + group.id">
              @for (item of group.items; track item.tab) {
                <button
                  type="button"
                  class="package-item"
                  [class.active]="activeTab() === item.tab"
                  [attr.aria-current]="activeTab() === item.tab ? 'page' : null"
                  (click)="navigate.emit(item.tab)"
                >
                  <ns-icon [name]="item.icon" /><span>{{ item.label }}</span>
                </button>
              }
            </div>
          }
        </section>
      }
    </nav>
  `,
  styleUrl: './staff-navigation.component.css',
})
export class StaffNavigationComponent {
  readonly role = input.required<string>();
  readonly activeTab = input.required<string>();
  readonly pending = input(0);
  readonly navigate = output<string>();
  readonly expanded = signal<ReadonlySet<string>>(new Set(['inicio']));
  readonly packages = computed(() => staffPackagesForRole(this.role()));
  constructor() {
    effect(() => {
      const tab = this.activeTab();
      const group = this.packages().find((group) => group.items.some((item) => item.tab === tab));
      if (group) this.expanded.update((current) => new Set([...current, group.id]));
    });
  }
  toggle(id: string): void {
    this.expanded.update((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  isCurrent(id: string): boolean {
    return (
      this.packages()
        .find((group) => group.id === id)
        ?.items.some((item) => item.tab === this.activeTab()) || false
    );
  }
}
