export interface PatientAnamnesis {
  id: string;
  patient_id: string;
  tenant_id?: string | null;
  pathologies?: string | null;
  allergies?: string | null;
  medications?: string | null;
  water_intake_liters: number;
  alcohol_frequency: string;
  smoke_habit: string;
  coffee_cups: number;
  sleep_hours: number;
  physical_activity: string;
  digestive_symptoms?: string | null;
  food_preferences?: string | null;
  goal: string;
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
