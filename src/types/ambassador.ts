
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
  status: 'active' | 'inactive' | 'lead';
  clients_count: number;
  commissions_total: number;
  last_commission: number;
  created_at: string;
  updated_at: string;
  has_user_account?: boolean;
  user_account_created_at?: string;
}

export interface DetailAmbassador extends Ambassador {
  // Including all properties from Ambassador
  clients?: any[];
  commissions?: any[];
  collaborators?: any[];
}

export interface AmbassadorCommission {
  id: string;
  ambassador_id: string;
  client_id: string;
  offer_id: string;
  contract_id: string;
  amount: number;
  status: 'pending' | 'paid';
  payment_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAmbassadorData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  notes?: string;
  status: 'active' | 'inactive';
  address?: string;
  vat_number?: string;
  city?: string;
  postal_code?: string;
  country?: string;
}
