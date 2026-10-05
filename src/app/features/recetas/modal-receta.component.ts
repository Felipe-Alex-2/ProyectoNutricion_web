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
  @Input() prefillData: any = null;
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
      calories: [null, [Validators.required, Validators.min(0)]],
      protein: [null, [Validators.required, Validators.min(0)]],
      carbohydrates: [null, [Validators.required, Validators.min(0)]],
      fats: [null, [Validators.required, Validators.min(0)]],
      fiber: [null, [Validators.min(0)]],
      sodium: [null, [Validators.min(0)]],
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
          fiber: this.editingRecipe.fiber ?? null,
          sodium: this.editingRecipe.sodium ?? null,
          servings: this.editingRecipe.servings || 1,
          prep_time_minutes: this.editingRecipe.prep_time_minutes ?? 15,
          cook_time_minutes: this.editingRecipe.cook_time_minutes ?? 15,
          difficulty: this.editingRecipe.difficulty || 'Fácil',
          category: this.editingRecipe.category || 'Almuerzo',
          ingredients: this.editingRecipe.ingredients || '',
          instructions: this.editingRecipe.instructions || '',
        });
        this.recipeSelectedPatients.set([...(this.editingRecipe.assigned_patient_ids || [])]);
      } else if (this.prefillData) {
        this.recipeForm.patchValue({
          title: this.prefillData.title || '',
          description: this.prefillData.description || '',
          image_url: this.prefillData.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
          calories: this.prefillData.calories ?? null,
          protein: this.prefillData.protein ?? null,
          carbohydrates: this.prefillData.carbohydrates ?? null,
          fats: this.prefillData.fats ?? null,
          fiber: this.prefillData.fiber ?? null,
          sodium: this.prefillData.sodium ?? null,
          servings: this.prefillData.servings || 1,
          prep_time_minutes: this.prefillData.prep_time_minutes ?? 15,
          cook_time_minutes: this.prefillData.cook_time_minutes ?? 15,
          difficulty: this.prefillData.difficulty || 'Fácil',
          category: this.prefillData.category || 'Almuerzo',
          ingredients: this.prefillData.ingredients || '',
          instructions: this.prefillData.instructions || '',
        });
        if (this.prefillData.patientId) {
          this.recipeSelectedPatients.set([this.prefillData.patientId]);
        } else {
          this.recipeSelectedPatients.set([]);
        }
      } else {
        // Nueva receta: se exige al usuario llenar los campos antes de crear
        this.recipeForm.reset({
          title: '',
          description: '',
          image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
          calories: null,
          protein: null,
          carbohydrates: null,
          fats: null,
          fiber: null,
          sodium: null,
          servings: 1,
          prep_time_minutes: 15,
          cook_time_minutes: 15,
          difficulty: 'Fácil',
          category: 'Almuerzo',
          ingredients: '',
          instructions: '',
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
    this.errorMessage = null;

    const rawVal = this.recipeForm.value;
    const cleanTitle = (rawVal.title || '').trim();
    const cleanIngredients = (rawVal.ingredients || '').trim();
    const cleanInstructions = (rawVal.instructions || '').trim();

    // 1. Validacion de campos vacios y obligatorios
    if (!cleanTitle) {
      this.recipeForm.get('title')?.markAsTouched();
      this.errorMessage = 'El nombre de la receta es obligatorio y no puede estar vacio.';
      return;
    }

    if (!cleanIngredients) {
      this.recipeForm.get('ingredients')?.markAsTouched();
      this.errorMessage = 'Debe ingresar los ingredientes y sus cantidades antes de guardar la receta.';
      return;
    }

    if (!cleanInstructions) {
      this.recipeForm.get('instructions')?.markAsTouched();
      this.errorMessage = 'Debe ingresar las instrucciones de preparacion antes de guardar la receta.';
      return;
    }

    if (
      rawVal.calories === null || rawVal.calories === undefined || rawVal.calories === '' ||
      rawVal.protein === null || rawVal.protein === undefined || rawVal.protein === '' ||
      rawVal.carbohydrates === null || rawVal.carbohydrates === undefined || rawVal.carbohydrates === '' ||
      rawVal.fats === null || rawVal.fats === undefined || rawVal.fats === ''
    ) {
      this.recipeForm.markAllAsTouched();
      this.errorMessage = 'Debe llenar todos los valores nutricionales obligatorios: Calorias, Proteinas, Carbohidratos y Grasas.';
      return;
    }

    if (this.recipeForm.invalid) {
      this.recipeForm.markAllAsTouched();
      this.errorMessage = 'Por favor complete todos los campos obligatorios con valores validos antes de continuar.';
      return;
    }

    // 2. Validacion de nombre repetido (duplicados)
    const titleVal = cleanTitle.toLowerCase();
    const editing = this.editingRecipe;
    const dupRecipe = this.recipeService.recipes().some(
      (r: Recipe) => r.title?.trim().toLowerCase() === titleVal && (!editing || r.id !== editing.id)
    );
    if (dupRecipe) {
      this.errorMessage = `Ya existe una receta con el nombre "${cleanTitle}". No se permite repetir el mismo nombre.`;
      return;
    }

    const payload = {
      ...rawVal,
      title: cleanTitle,
      ingredients: cleanIngredients,
      instructions: cleanInstructions,
      calories: Number(rawVal.calories),
      protein: Number(rawVal.protein),
      carbohydrates: Number(rawVal.carbohydrates),
      fats: Number(rawVal.fats),
      fiber: rawVal.fiber !== null && rawVal.fiber !== '' && rawVal.fiber !== undefined ? Number(rawVal.fiber) : 0,
      sodium: rawVal.sodium !== null && rawVal.sodium !== '' && rawVal.sodium !== undefined ? Number(rawVal.sodium) : 0,
      servings: rawVal.servings ? Number(rawVal.servings) : 1,
      prep_time_minutes: rawVal.prep_time_minutes !== null && rawVal.prep_time_minutes !== '' ? Number(rawVal.prep_time_minutes) : 0,
      cook_time_minutes: rawVal.cook_time_minutes !== null && rawVal.cook_time_minutes !== '' ? Number(rawVal.cook_time_minutes) : 0,
      assigned_patient_ids: this.recipeSelectedPatients(),
    };

    if (this.editingRecipe) {
      this.recipeService.updateRecipe(this.editingRecipe.id, payload).subscribe({
        next: () => {
          this.saved.emit({ isEdit: true, title: payload.title });
          this.cerrar();
        },
        error: (err: any) => {
          const msg = err?.error?.detail || 'Error al actualizar receta';
          this.errorMessage = typeof msg === 'string' ? msg : JSON.stringify(msg);
        },
      });
    } else {
      this.recipeService.createRecipe(payload).subscribe({
        next: () => {
          this.saved.emit({ isEdit: false, title: payload.title });
          this.cerrar();
        },
        error: (err: any) => {
          const msg = err?.error?.detail || 'Error al guardar receta';
          this.errorMessage = typeof msg === 'string' ? msg : JSON.stringify(msg);
        },
      });
    }
  }

  cerrar(): void {
    this.closed.emit();
  }
}
