export interface PatientAnamnesis {
  id: string;
  patient_id: string;
  tenant_id?: string | null;

  // Datos biométricos y ML
  birth_date?: string | null;
  gender: string;
  weight_kg: number;
  height_cm: number;
  target_weight_kg?: number | null;
  target_weeks?: number | null;

  // Antecedentes y alergias
  pathologies?: string | null;
  allergies?: string | null;
  medications?: string | null;
  other_allergies?: string | null;
  other_pathologies?: string | null;

  // Hábitos de vida y estilo
  water_intake_liters: number;
  alcohol_frequency: string;
  smoke_habit: string;
  coffee_cups: number;
  sleep_hours: number;

  // Sistema experto
  fruits_vegetables_daily: number;
  sugary_drinks_weekly: number;
  meals_per_day: number;
  is_pregnant_or_lactating: boolean;

  // Actividad física y digestión
  physical_activity: string;
  digestive_symptoms?: string | null;
  food_preferences?: string | null;
  goal: string;
  consent_data_processing: boolean;

  created_at: string;
  updated_at: string;
}

export interface ClinicalRecord {
  id: string;
  patient_id: string;
  nutritionist_id: string;
  tenant_id?: string | null;
  diagnosis: string;
  evolution_notes?: string | null;
  clinical_goals?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClinicalRecordCreate {
  diagnosis: string;
  evolution_notes?: string;
  clinical_goals?: string;
}

export interface FoodItemModel {
  name: string;
  portion: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}

export interface MealItemModel {
  meal_name: string;
  time_suggestion?: string;
  foods: FoodItemModel[];
  total_calories: number;
}

export interface NutritionalPlanModel {
  id: string;
  patient_id: string;
  nutritionist_id?: string | null;
  tenant_id?: string | null;
  status: string; // DRAFT, APPROVED, REJECTED
  title: string;
  goal: string;
  daily_calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  fiber_g?: number;
  meals_per_day: number;
  meals: MealItemModel[];
  weekly_menu?: any;
  clinical_notes?: string | null;
  requires_special_review: boolean;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}
