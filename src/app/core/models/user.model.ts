export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role_id: string;
  tenant_id?: string;
  is_active: boolean;
  is_verified: boolean;
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
}

export interface OrganizationUserCreate {
  email: string;
  full_name: string;
  phone?: string;
  password: string;
  role_id: string;
  tenant_id: string;
}
