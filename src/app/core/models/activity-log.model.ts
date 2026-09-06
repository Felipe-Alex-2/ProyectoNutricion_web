export interface ActivityLog {
  id: string;
  user_id?: string;
  user_email?: string;
  user_name?: string;
  action: string;
  description: string;
  category: string;
  ip_address?: string;
  created_at: string;
}

export interface ActivityLogCreate {
  action: string;
  description: string;
  category?: string;
}
