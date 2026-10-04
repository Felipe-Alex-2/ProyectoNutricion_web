import { Component, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AIPlanService } from '../../core/services/ai-plan.service';
import { NotificationService } from '../../core/services/notification.service';
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

  // Modal Encuesta Estilo WhatsApp
  isSurveyModalOpen = signal<boolean>(false);
  surveyQuestion = signal<string>('¿Estás cumpliendo tu ingesta de 2 litros de agua diarios esta semana?');
  surveyOptions = signal<string[]>(['Sí, todos los días', 'La mayoría de días', 'A veces', 'No, casi nada']);
  selectedPatientId = signal<string>('ALL');
  isSendingSurvey = signal<boolean>(false);

  private intervalId: any;

  constructor(
    public aiPlanService: AIPlanService,
    private notificationService: NotificationService
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

  openSurveyModal(): void {
    this.isSurveyModalOpen.set(true);
    this.automationError.set(null);
  }

  closeSurveyModal(): void {
    this.isSurveyModalOpen.set(false);
  }

  addSurveyOption(): void {
    this.surveyOptions.update((opts) => [...opts, 'Nueva opción']);
  }

  removeSurveyOption(index: number): void {
    this.surveyOptions.update((opts) => opts.filter((_, i) => i !== index));
  }

  updateSurveyOption(index: number, val: string): void {
    this.surveyOptions.update((opts) => {
      const copy = [...opts];
      copy[index] = val;
      return copy;
    });
  }

  sendSurvey(): void {
    const question = this.surveyQuestion().trim();
    if (!question) {
      this.automationError.set('Por favor escribe la pregunta de la encuesta');
      return;
    }
    const opts = this.surveyOptions().map((o) => o.trim()).filter((o) => o.length > 0);
    if (opts.length < 2) {
      this.automationError.set('La encuesta debe tener al menos 2 opciones');
      return;
    }

    this.isSendingSurvey.set(true);
    const targetPatients = this.selectedPatientId() === 'ALL'
      ? this.patients
      : this.patients.filter((p) => p.id === this.selectedPatientId());

    if (targetPatients.length === 0) {
      this.automationError.set('No hay pacientes seleccionados para recibir la encuesta');
      this.isSendingSurvey.set(false);
      return;
    }

    const payloadRef = JSON.stringify({
      survey_id: `encuesta_${Date.now()}`,
      question: question,
      options: opts,
      created_at: new Date().toISOString(),
    });

    let sentCount = 0;
    targetPatients.forEach((p) => {
      this.notificationService.sendNotification({
        user_id: p.id,
        title: '📋 Encuesta Semanal de Hábitos',
        message: `Tu especialista nutricional te ha enviado una encuesta: "${question}"`,
        type: 'ENCUESTA_HABITOS',
        reference_id: payloadRef,
      }).subscribe({
        next: () => {
          sentCount++;
          if (sentCount === targetPatients.length) {
            this.isSendingSurvey.set(false);
            this.isSurveyModalOpen.set(false);
            this.automationSuccess.set(`¡Encuesta enviada exitosamente a ${sentCount} paciente(s)! Recibirás sus respuestas en tus notificaciones.`);
            setTimeout(() => this.automationSuccess.set(null), 6000);
          }
        },
        error: () => {
          this.isSendingSurvey.set(false);
        },
      });
    });
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
