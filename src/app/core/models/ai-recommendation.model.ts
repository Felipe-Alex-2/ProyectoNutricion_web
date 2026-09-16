export interface RecipeRecommendationItem {
  recipe_id: string;
  recipe_title: string;
  category: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fats: number;
  fiber: number;
  match_score: number;
  compatibility_level: string; // 'ALTA' | 'MEDIA' | 'PRECAUCION' | 'CONTRAINDICADA'
  reasons: string[];
  warnings: string[];
  clinical_notes?: string;
  already_assigned: boolean;
}

export interface AIRecommendationResponse {
  patient_id: string;
  patient_name: string;
  patient_goal?: string;
  known_pathologies?: string;
  known_allergies?: string;
  summary_analysis: string;
  generated_at: string;
  recommendations: RecipeRecommendationItem[];
}
