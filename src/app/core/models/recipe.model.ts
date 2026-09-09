export interface Recipe {
  id: string;
  tenant_id?: string | null;
  created_by: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  calories: number;
  protein: number;
  carbohydrates: number;
  fats: number;
  fiber: number;
  sodium?: number | null;
  servings: number;
  prep_time_minutes: number;
  cook_time_minutes: number;
  difficulty: string;
  category: string;
  ingredients: string;
  instructions: string;
  assigned_patient_ids?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecipeCreate {
  title: string;
  description?: string;
  image_url?: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fats: number;
  fiber: number;
  sodium?: number;
  servings: number;
  prep_time_minutes: number;
  cook_time_minutes: number;
  difficulty: string;
  category: string;
  ingredients: string;
  instructions: string;
  assigned_patient_ids?: string[];
}

export interface RecipeUpdate extends Partial<RecipeCreate> {
  is_active?: boolean;
}
