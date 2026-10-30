import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/ui/icon.component';
import { AuthService } from '../../core/services/auth.service';
import { TokenService } from '../../core/services/token.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, IconComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
})
export class LandingComponent {
  readonly auth = inject(AuthService);
  readonly tokens = inject(TokenService);
  readonly features = [
    {
      icon: 'leaf',
      title: 'Un plan que se adapta a ti',
      text: 'Consulta tus comidas, porciones y recetas asignadas por tu nutricionista. Todo en un mismo lugar.',
    },
    {
      icon: 'calendar',
      title: 'Tu especialista, más cerca',
      text: 'Solicita una cita, revisa su confirmación y mantente al día con las notificaciones de tu clínica.',
    },
    {
      icon: 'sparkles',
      title: 'Apoyo para tu día a día',
      text: 'Explora tu menú semanal y las herramientas de inteligencia artificial disponibles para tu cuenta.',
    },
  ];
}
