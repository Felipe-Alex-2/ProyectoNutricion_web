export interface Appointment {
  id: string;
  tenant_id?: string | null;
  tenant_name?: string | null;
  patient_id: string;
  patient_name?: string | null;
  patient_email?: string | null;
  nutritionist_id: string;
  nutritionist_name?: string | null;
  scheduled_at: string;
  reason?: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  cancellation_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentCreate {
  nutritionist_id: string;
  scheduled_at: string;
  reason?: string | null;
  tenant_id?: string | null;
}

export interface AppointmentCancel {
  cancellation_reason?: string | null;
}

export interface Nutritionist {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
}
