export interface Tenant {
  id: string;
  name: string;
  code: string;
  phone?: string;
  email?: string;
  address?: string;
  department_code?: string;
  logo_url?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  users_count?: number;
}

export interface TenantCreate {
  department_code?: string;
  initial_province_code?: string;
  initial_municipality_code?: string;
  name: string;
  code: string;
  phone?: string;
  email?: string;
  address?: string;
  logo_url?: string;
  description?: string;
  is_active?: boolean;
}

export interface TenantUpdate {
  department_code?: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  logo_url?: string;
  description?: string;
  is_active?: boolean;
}
