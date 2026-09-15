export interface Payment {
  id: string;
  tenant_id: string;
  tenant_name?: string | null;
  cashier_id?: string | null;
  cashier_name?: string | null;
  customer_name: string;
  customer_email?: string | null;
  concept: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
  paypal_order_id?: string | null;
  paypal_capture_id?: string | null;
  notes?: string | null;
  created_at: string;
  paid_at?: string | null;
}

export interface PaymentCreate {
  tenant_id: string;
  customer_name: string;
  customer_email?: string | null;
  concept: string;
  amount: number;
  currency?: string;
  notes?: string | null;
}

export interface PaymentOrderCreated {
  payment_id: string;
  paypal_order_id: string;
  approval_url: string;
  amount: number;
  currency: string;
  concept: string;
  customer_name: string;
}

export interface PaymentStats {
  total_collected: number;
  total_count: number;
  completed_count: number;
  pending_count: number;
}
