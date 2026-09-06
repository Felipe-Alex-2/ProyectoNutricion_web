export interface Tenant {
  id: string;
  name: string;
  code: string;
  phone?: string;
  email?: string;
  address?: string;
  logo_url?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  users_count?: number;
}

export interface TenantCreate {
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
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  logo_url?: string;
  description?: string;
  is_active?: boolean;
}
