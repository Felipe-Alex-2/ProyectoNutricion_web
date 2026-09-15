export interface Notification {
  id: string;
  user_id: string;
  tenant_id?: string | null;
  title: string;
  message: string;
  type: string;
  reference_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationCount {
  unread_count: number;
}
