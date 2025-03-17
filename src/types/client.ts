
export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  vat_number?: string;
  company?: string;
  website?: string;
  notes?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at?: string;
  ambassador_id?: string | null;
  has_user_account?: boolean;
  user_account_created_at?: string;
  user_id?: string | null;
}
