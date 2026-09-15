export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface SubscriptionPlan {
  name: string;
  display_name: string;
  price: number;
  currency: string;
  period: string;
  max_patients: number | null;
  features: PlanFeature[];
  recommended: boolean;
}

export interface Subscription {
  id: string;
  tenant_id: string;
  plan_name: string;
  status: string;
  amount: number;
  currency: string;
  started_at: string | null;
  expires_at: string | null;
  created_at: string;
  paypal_order_id: string | null;
}

export interface CreateOrderResponse {
  order_id: string;
  approval_url: string;
}

export interface SubscriptionHistory {
  id: string;
  plan_name: string;
  status: string;
  amount: number;
  currency: string;
  started_at: string | null;
  expires_at: string | null;
  created_at: string;
  paypal_order_id: string | null;
}
