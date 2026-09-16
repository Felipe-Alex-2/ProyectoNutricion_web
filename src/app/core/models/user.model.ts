export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role_id: string;
  tenant_id?: string;
  is_active: boolean;
  is_verified: boolean;
  has_custom_developer_key?: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserUpdate {
  full_name?: string;
  email?: string;
  phone?: string;
  password?: string;
  role_id?: string;
  tenant_id?: string;
  is_active?: boolean;
  developer_key?: string;
}

export interface OrganizationUserCreate {
  email: string;
  full_name: string;
  phone?: string;
  password: string;
  role_id: string;
  tenant_id: string;
}

export interface PatientListItem {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  is_active: boolean;
  tenant_id?: string;
  created_at: string;
  updated_at: string;
  linked_status: string;
  nutritionist_name?: string;
  pairing_code?: string;
}

export interface DeveloperKeyVerifyRequest {
  developer_key: string;
}

export interface DeveloperKeyVerifyResponse {
  valid: boolean;
  message: string;
}
