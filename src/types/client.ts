
export interface Collaborator {
  id: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
  department?: string;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  company?: string;
  phone?: string;
  address?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  status?: 'active' | 'inactive' | 'lead';
  vat_number?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  collaborators?: Collaborator[];
  user_id?: string;
  has_user_account?: boolean;
  user_account_created_at?: string | Date;
}

export interface CreateClientData {
  name: string;
  email?: string;
  company?: string;
  phone?: string;
  address?: string;
  notes?: string;
  user_id?: string;
  status?: 'active' | 'inactive' | 'lead';
  vat_number?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  collaborators?: Collaborator[];
}
