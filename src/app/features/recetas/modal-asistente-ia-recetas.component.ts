import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClinicalService } from '../../core/services/clinical.service';
import { RecipeService } from '../../core/services/recipe.service';
import { PatientListItem } from '../../core/models/user.model';
import { AIRecommendationResponse } from '../../core/models/ai-recommendation.model';

@Component({
  selector: 'app-modal-asistente-ia-recetas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-asistente-ia-recetas.component.html',
  styleUrls: ['./modal-asistente-ia-recetas.component.css'],
})
export class ModalAsistenteIaRecetasComponent implements OnChanges {
  @Input() isOpen: boolean = false;
  @Input() patient: PatientListItem | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() recipeAssigned = new EventEmitter<string>();

  aiRecommendations = signal<AIRecommendationResponse | null>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  constructor(
    public clinicalService: ClinicalService,
    public recipeService: RecipeService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.patient) {
      this.consultarRecomendaciones();
    } else if (changes['patient'] && this.patient && this.isOpen) {
      this.consultarRecomendaciones();
    }
  }

  consultarRecomendaciones(): void {
    if (!this.patient) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.aiRecommendations.set(null);

    this.clinicalService.getAiRecommendations(this.patient.id).subscribe({
      next: (data) => {
        this.aiRecommendations.set(data);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        this.errorMessage.set(err?.error?.detail || 'Error al consultar al Asistente Inteligente IA');
        this.isLoading.set(false);
      },
    });
  }

  asignarReceta(recipeId: string): void {
    if (!this.patient) return;
    this.recipeService.assignRecipe(recipeId, this.patient.id).subscribe({
      next: () => {
        this.successMessage.set('¡Receta prescrita y vinculada al plan del cliente exitosamente!');
        this.aiRecommendations.update((curr) => {
          if (!curr) return null;
          return {
            ...curr,
            recommendations: curr.recommendations.map((r) =>
              r.recipe_id === recipeId ? { ...r, already_assigned: true } : r
            ),
          };
        });
        this.recipeAssigned.emit(recipeId);
        setTimeout(() => this.successMessage.set(null), 4000);
      },
      error: (err: any) => {
        this.errorMessage.set(err?.error?.detail || 'Error al asignar la receta al paciente');
        setTimeout(() => this.errorMessage.set(null), 4000);
      },
    });
  }

  cerrar(): void {
    this.closed.emit();
  }
}
