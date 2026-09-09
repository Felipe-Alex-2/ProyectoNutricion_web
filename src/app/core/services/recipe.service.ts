import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Recipe, RecipeCreate, RecipeUpdate } from '../models/recipe.model';

@Injectable({
  providedIn: 'root',
})
export class RecipeService {
  private apiUrl = `${environment.apiUrl}/recipes`;

  recipes = signal<Recipe[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  loadRecipes(category?: string): Observable<Recipe[]> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const params: any = {};
    if (category) params.category = category;

    return this.http.get<Recipe[]>(this.apiUrl, { params }).pipe(
      tap({
        next: (data) => {
          this.recipes.set(data);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.detail || 'Error al cargar recetas');
          this.isLoading.set(false);
        },
      })
    );
  }

  createRecipe(data: RecipeCreate): Observable<Recipe> {
    this.isLoading.set(true);
    return this.http.post<Recipe>(this.apiUrl, data).pipe(
      tap({
        next: (newRecipe) => {
          this.recipes.update((current) => [newRecipe, ...current]);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.detail || 'Error al crear receta');
          this.isLoading.set(false);
        },
      })
    );
  }

  updateRecipe(id: string, data: RecipeUpdate): Observable<Recipe> {
    this.isLoading.set(true);
    return this.http.put<Recipe>(`${this.apiUrl}/${id}`, data).pipe(
      tap({
        next: (updated) => {
          this.recipes.update((current) =>
            current.map((r) => (r.id === id ? updated : r))
          );
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.detail || 'Error al actualizar receta');
          this.isLoading.set(false);
        },
      })
    );
  }

  deleteRecipe(id: string): Observable<any> {
    this.isLoading.set(true);
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap({
        next: () => {
          this.recipes.update((current) => current.filter((r) => r.id !== id));
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.detail || 'Error al eliminar receta');
          this.isLoading.set(false);
        },
      })
    );
  }
}
