import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RecipeService } from '../../core/services/recipe.service';
import { Recipe } from '../../core/models/recipe.model';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-modal-receta',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modal-receta.component.html',
  styleUrls: ['./modal-receta.component.css'],
})
export class ModalRecetaComponent implements OnChanges {
  @Input() isOpen: boolean = false;
  @Input() editingRecipe: Recipe | null = null;
  @Input() orgUsers: User[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<{ isEdit: boolean; title: string }>();

  recipeForm: FormGroup;
  recipeSelectedPatients = signal<string[]>([]);
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    public recipeService: RecipeService
  ) {
    this.recipeForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(250)]],
      description: [''],
      image_url: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c'],
      calories: [450, [Validators.required, Validators.min(0)]],
      protein: [30, [Validators.required, Validators.min(0)]],
      carbohydrates: [40, [Validators.required, Validators.min(0)]],
      fats: [15, [Validators.required, Validators.min(0)]],
      fiber: [6, [Validators.min(0)]],
      sodium: [250, [Validators.min(0)]],
      servings: [1, [Validators.required, Validators.min(1)]],
      prep_time_minutes: [15, [Validators.required, Validators.min(0)]],
      cook_time_minutes: [15, [Validators.required, Validators.min(0)]],
      difficulty: ['Fácil', [Validators.required]],
      category: ['Almuerzo', [Validators.required]],
      ingredients: ['', [Validators.required, Validators.minLength(3)]],
      instructions: ['', [Validators.required, Validators.minLength(5)]],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.errorMessage = null;
      if (this.editingRecipe) {
        this.recipeForm.patchValue({
          title: this.editingRecipe.title,
          description: this.editingRecipe.description || '',
          image_url: this.editingRecipe.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
          calories: this.editingRecipe.calories,
          protein: this.editingRecipe.protein,
          carbohydrates: this.editingRecipe.carbohydrates,
          fats: this.editingRecipe.fats,
          fiber: this.editingRecipe.fiber || 0,
          sodium: this.editingRecipe.sodium || 0,
          servings: this.editingRecipe.servings || 1,
          prep_time_minutes: this.editingRecipe.prep_time_minutes || 15,
          cook_time_minutes: this.editingRecipe.cook_time_minutes || 15,
          difficulty: this.editingRecipe.difficulty || 'Fácil',
          category: this.editingRecipe.category || 'Almuerzo',
          ingredients: this.editingRecipe.ingredients || '',
          instructions: this.editingRecipe.instructions || '',
        });
        this.recipeSelectedPatients.set([...(this.editingRecipe.assigned_patient_ids || [])]);
      } else {
        this.recipeForm.reset({
          image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
          calories: 450,
          protein: 30,
          carbohydrates: 40,
          fats: 15,
          fiber: 6,
          sodium: 250,
          servings: 1,
          prep_time_minutes: 15,
          cook_time_minutes: 15,
          difficulty: 'Fácil',
          category: 'Almuerzo',
        });
        this.recipeSelectedPatients.set([]);
      }
    }
  }

  togglePatient(userId: string): void {
    this.recipeSelectedPatients.update((ids) =>
      ids.includes(userId) ? ids.filter((id) => id !== userId) : [...ids, userId]
    );
  }

  selectAllPatients(all: boolean): void {
    if (all) {
      const allClients = this.orgUsers.filter((u) => u.role_id === 'CLIENTE').map((u) => u.id);
      this.recipeSelectedPatients.set(allClients);
    } else {
      this.recipeSelectedPatients.set([]);
    }
  }

  guardar(): void {
    if (this.recipeForm.invalid) {
      this.recipeForm.markAllAsTouched();
      return;
    }
    this.errorMessage = null;

    const titleVal = this.recipeForm.value.title?.trim().toLowerCase();
    const editing = this.editingRecipe;
    const dupRecipe = this.recipeService.recipes().some(
      (r: Recipe) => r.title?.trim().toLowerCase() === titleVal && (!editing || r.id !== editing.id)
    );
    if (dupRecipe) {
      this.errorMessage = `Ya existe una receta con el nombre "${this.recipeForm.value.title?.trim()}". No se puede repetir el mismo nombre.`;
      return;
    }

    const payload = {
      ...this.recipeForm.value,
      assigned_patient_ids: this.recipeSelectedPatients(),
    };

    if (this.editingRecipe) {
      this.recipeService.updateRecipe(this.editingRecipe.id, payload).subscribe({
        next: () => {
          this.saved.emit({ isEdit: true, title: payload.title });
          this.cerrar();
        },
        error: (err: any) => {
          this.errorMessage = err?.error?.detail || 'Error al actualizar receta';
        },
      });
    } else {
      this.recipeService.createRecipe(payload).subscribe({
        next: () => {
          this.saved.emit({ isEdit: false, title: payload.title });
          this.cerrar();
        },
        error: (err: any) => {
          this.errorMessage = err?.error?.detail || 'Error al guardar receta';
        },
      });
    }
  }

  cerrar(): void {
    this.closed.emit();
  }
}
