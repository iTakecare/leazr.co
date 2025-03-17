
export interface Partner {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
  type: 'distributor' | 'integrator';
  created_at?: string;
  updated_at?: string;
  additional_info?: string;
  commission_level_id?: string;
  commissions_total?: number;
  has_user_account?: boolean;
  user_account_created_at?: string;
}
