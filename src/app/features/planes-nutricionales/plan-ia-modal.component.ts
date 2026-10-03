import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AIPlanService } from '../../core/services/ai-plan.service';
import { NutritionalPlanModel } from '../../core/models/clinical.model';
import { PatientListItem } from '../../core/models/user.model';

@Component({
  selector: 'app-plan-ia-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './plan-ia-modal.component.html',
  styleUrls: ['./plan-ia-modal.component.css'],
})
export class PlanIaModalComponent implements OnChanges {
  @Input() isOpen: boolean = false;
  @Input() patient: PatientListItem | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() planApproved = new EventEmitter<NutritionalPlanModel>();

  selectedPlanDraft = signal<NutritionalPlanModel | null>(null);
  isGeneratingAiPlan = signal<boolean>(false);
  isApprovingAiPlan = signal<boolean>(false);
  aiPlanError = signal<string | null>(null);
  aiPlanSuccess = signal<string | null>(null);

  planCalorieAdjustmentPct = signal<number>(0);
  planMealsPerDay = signal<number>(4);
  planCustomGoal = signal<string>('');

  constructor(public aiPlanService: AIPlanService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.patient) {
      this.cargarPlanesExistentes();
    } else if (changes['patient'] && this.patient && this.isOpen) {
      this.cargarPlanesExistentes();
    }
  }

  cargarPlanesExistentes(): void {
    if (!this.patient) return;
    this.aiPlanError.set(null);
    this.aiPlanSuccess.set(null);
    this.selectedPlanDraft.set(null);
    this.planCalorieAdjustmentPct.set(0);
    this.planMealsPerDay.set(4);
    this.planCustomGoal.set('');

    this.aiPlanService.getPatientPlans(this.patient.id).subscribe({
      next: (plans) => {
        const approved = plans.find((p) => p.status === 'APPROVED');
        const draft = plans.find((p) => p.status === 'DRAFT');
        this.selectedPlanDraft.set(approved || draft || null);
      },
      error: () => {},
    });
  }

  generarBorrador(): void {
    if (!this.patient) return;
    this.isGeneratingAiPlan.set(true);
    this.aiPlanError.set(null);
    this.aiPlanSuccess.set(null);

    this.aiPlanService
      .generateDraft(
        this.patient.id,
        this.planCustomGoal() || undefined,
        this.planCalorieAdjustmentPct() || undefined,
        this.planMealsPerDay() || 4
      )
      .subscribe({
        next: (draft) => {
          this.selectedPlanDraft.set(draft);
          this.isGeneratingAiPlan.set(false);
          this.aiPlanSuccess.set(
            '¡Borrador generado con éxito con cálculo Mifflin-St Jeor y reglas de seguridad clínica!'
          );
        },
        error: (err: any) => {
          this.isGeneratingAiPlan.set(false);
          this.aiPlanError.set(err?.error?.detail || 'Error al generar el borrador con IA.');
        },
      });
  }

  aprobarPlan(): void {
    const plan = this.selectedPlanDraft();
    if (!plan) return;
    this.isApprovingAiPlan.set(true);
    this.aiPlanError.set(null);
    this.aiPlanSuccess.set(null);

    this.aiPlanService.approvePlan(plan.id).subscribe({
      next: (approvedPlan) => {
        this.selectedPlanDraft.set(approvedPlan);
        this.isApprovingAiPlan.set(false);
        this.aiPlanSuccess.set('¡Plan aprobado y publicado! El paciente ahora tiene su menú de 7 días activo en la App Móvil.');
        this.planApproved.emit(approvedPlan);
      },
      error: (err: any) => {
        this.isApprovingAiPlan.set(false);
        this.aiPlanError.set(err?.error?.detail || 'Error al aprobar el plan.');
      },
    });
  }

  cerrar(): void {
    this.closed.emit();
  }
}
