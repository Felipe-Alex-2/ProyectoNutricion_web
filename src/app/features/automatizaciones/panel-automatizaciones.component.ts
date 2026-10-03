import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AIPlanService } from '../../core/services/ai-plan.service';

@Component({
  selector: 'app-panel-automatizaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './panel-automatizaciones.component.html',
  styleUrls: ['./panel-automatizaciones.component.css'],
})
export class PanelAutomatizacionesComponent {
  automationRunning = signal<string | null>(null);
  automationSuccess = signal<string | null>(null);
  automationError = signal<string | null>(null);
  automationResult = signal<any | null>(null);

  constructor(public aiPlanService: AIPlanService) {}

  ejecutarRecordatoriosCitas(): void {
    this.automationRunning.set('appointments');
    this.automationSuccess.set(null);
    this.automationError.set(null);

    this.aiPlanService.triggerCheckAppointments().subscribe({
      next: (res) => {
        this.automationRunning.set(null);
        this.automationResult.set(res);
        this.automationSuccess.set(
          `RPA Citas: ${res.message || 'Verificación completada'} (Recordatorios enviados: ${res.reminders_sent ?? 0})`
        );
        setTimeout(() => this.automationSuccess.set(null), 6000);
      },
      error: (err: any) => {
        this.automationRunning.set(null);
        this.automationError.set(err?.error?.detail || 'Error al ejecutar RPA de citas');
        setTimeout(() => this.automationError.set(null), 5000);
      },
    });
  }

  ejecutarEvaluacionHabitos(): void {
    this.automationRunning.set('habits');
    this.automationSuccess.set(null);
    this.automationError.set(null);

    this.aiPlanService.triggerWeeklyHabits().subscribe({
      next: (res) => {
        this.automationRunning.set(null);
        this.automationResult.set(res);
        this.automationSuccess.set(
          `RPA Hábitos: ${res.message || 'Evaluación de hábitos completada'} (Pacientes evaluados: ${res.patients_evaluated ?? 0})`
        );
        setTimeout(() => this.automationSuccess.set(null), 6000);
      },
      error: (err: any) => {
        this.automationRunning.set(null);
        this.automationError.set(err?.error?.detail || 'Error al evaluar hábitos semanales');
        setTimeout(() => this.automationError.set(null), 5000);
      },
    });
  }

  ejecutarResumenNutricionista(): void {
    this.automationRunning.set('summary');
    this.automationSuccess.set(null);
    this.automationError.set(null);

    this.aiPlanService.triggerNutritionistSummary().subscribe({
      next: (res) => {
        this.automationRunning.set(null);
        this.automationResult.set(res);
        this.automationSuccess.set('RPA Resumen Nutricionista generado exitosamente.');
        setTimeout(() => this.automationSuccess.set(null), 6000);
      },
      error: (err: any) => {
        this.automationRunning.set(null);
        this.automationError.set(err?.error?.detail || 'Error al generar resumen para nutricionista');
        setTimeout(() => this.automationError.set(null), 5000);
      },
    });
  }
}
