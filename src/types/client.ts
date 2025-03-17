
export interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: string;
  client_id: string;
  phone?: string;
  department?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateClientData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  notes?: string;
  status?: 'lead' | 'active' | 'inactive';
  ambassador_id?: string | null;
  user_id?: string | null;
  vat_number?: string;
  collaborators?: Collaborator[];
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  notes?: string;
  status: 'lead' | 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  ambassador_id?: string;
  has_user_account?: boolean;
  user_id?: string;
  user_account_created_at?: string;
  collaborators?: Collaborator[];
  vat_number?: string;
}
