import { Component, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AIPlanService } from '../../core/services/ai-plan.service';
import { PatientListItem } from '../../core/models/user.model';

@Component({
  selector: 'app-panel-automatizaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './panel-automatizaciones.component.html',
  styleUrls: ['./panel-automatizaciones.component.css'],
})
export class PanelAutomatizacionesComponent implements OnInit, OnDestroy {
  @Input() patients: PatientListItem[] = [];

  automationRunning = signal<string | null>(null);
  automationSuccess = signal<string | null>(null);
  automationError = signal<string | null>(null);
  automationResult = signal<any | null>(null);

  private intervalId: any;

  constructor(
    public aiPlanService: AIPlanService
  ) {}

  ngOnInit(): void {
    // Recordatorio de citas a 1 hora automático cada 15 minutos en segundo plano
    this.intervalId = setInterval(() => {
      this.aiPlanService.triggerCheckAppointments().subscribe({
        next: (res) => {
          if (res.reminders_sent && res.reminders_sent > 0) {
            this.automationSuccess.set(`Recordatorios automáticos enviados: ${res.reminders_sent}`);
            setTimeout(() => this.automationSuccess.set(null), 5000);
          }
        },
        error: () => {},
      });
    }, 900000); // 15 min
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

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
