export interface PatientLink {
  id: string;
  tenant_id?: string;
  nutritionist_id: string;
  nutritionist_name?: string;
  patient_id?: string;
  patient_name?: string;
  pairing_code: string;
  whatsapp_number: string;
  whatsapp_url: string;
  status: 'PENDING' | 'LINKED' | 'EXPIRED' | 'CANCELLED';
  notes?: string;
  created_at: string;
  linked_at?: string;
}

export interface GenerateLinkRequest {
  whatsapp_number?: string;
  tenant_id?: string;
  notes?: string;
}

export interface ClaimLinkRequest {
  pairing_code: string;
}
