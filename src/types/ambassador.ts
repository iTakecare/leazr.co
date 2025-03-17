
export interface Ambassador {
  id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  vat_number?: string;
  region?: string;
  notes?: string;
  status: string;
  clients_count?: number;
  commissions_total?: number;
  last_commission?: number;
  user_id?: string;
  has_user_account?: boolean;
  user_account_created_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AmbassadorCommission {
  id: string;
  ambassador_id: string;
  amount: number;
  client_name: string;
  client_id?: string;
  description?: string;
  status: 'pending' | 'paid' | 'canceled';
  date: string;
  created_at: string;
}

export interface CommissionPlan {
  id: string;
  name: string;
  ranges: CommissionRange[];
}

export interface CommissionRange {
  min: number;
  max: number;
  rate: number;
}
