import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { IconComponent } from '../../shared/ui/icon.component';

@Component({
  selector: 'app-auth-showcase',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './auth-showcase.component.html',
  styleUrl: './auth-showcase.component.css',
})
export class AuthShowcaseComponent implements OnInit {
  private readonly destroy = inject(DestroyRef);
  readonly activeSlide = signal(0);
  readonly paused = signal(false);
  readonly hovered = signal(false);
  readonly focused = signal(false);
  private timer?: ReturnType<typeof setInterval>;
  readonly slides = [
    {
      crop: '0 0 557 941',
      badge: 'Nutrición para tu vida',
      eyebrow: 'ALIMENTA TU BIENESTAR',
      title: 'Comer bien también es cuidarte.',
      text: 'Un plan pensado para ti, con recetas y porciones que acompañan tu día a día.',
      alt: 'Plato equilibrado con verduras frescas, aguacate y quinoa sobre una mesa clara.',
    },
    {
      crop: '557 0 557 941',
      badge: 'Acompañamiento profesional',
      eyebrow: 'CERCA DE TU ESPECIALISTA',
      title: 'Tu camino, con buena compañía.',
      text: 'Conecta con tu nutricionista y organiza tus consultas desde un mismo lugar.',
      alt: 'Una nutricionista conversa con una paciente en un consultorio luminoso.',
    },
    {
      crop: '1114 0 558 941',
      badge: 'Pequeños pasos, grandes hábitos',
      eyebrow: 'BIENESTAR A TU RITMO',
      title: 'Cada día es una nueva oportunidad.',
      text: 'Conoce tus hábitos y encuentra orientación para avanzar hacia tus metas.',
      alt: 'Una mujer camina por un parque con una botella de agua reutilizable.',
    },
  ];
  ngOnInit(): void {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.paused.set(motion.matches);
    const onMotion = (event: MediaQueryListEvent) => {
      if (event.matches) this.paused.set(true);
    };
    motion.addEventListener('change', onMotion);
    this.startTimer();
    this.destroy.onDestroy(() => {
      clearInterval(this.timer);
      motion.removeEventListener('change', onMotion);
    });
  }
  private startTimer(): void {
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (!this.paused() && !this.hovered() && !this.focused() && !document.hidden)
        this.activeSlide.update((i) => (i + 1) % this.slides.length);
    }, 10000);
  }
  select(index: number): void {
    this.activeSlide.set((index + this.slides.length) % this.slides.length);
    this.startTimer();
  }
  toggle(): void {
    this.paused.update((value) => !value);
    this.startTimer();
  }
  onFocusOut(event: FocusEvent): void {
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null))
      this.focused.set(false);
  }
}
