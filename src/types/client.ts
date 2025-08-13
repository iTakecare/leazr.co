
// Updated to remove shipping address fields
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
  first_name?: string;
  last_name?: string;
  email?: string;
  company?: string;
  phone?: string;
  address?: string;
  billing_address?: string;
  billing_city?: string;
  billing_postal_code?: string;
  billing_country?: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_postal_code?: string;
  delivery_country?: string;
  delivery_same_as_billing?: boolean;
  notes?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
  status?: 'active' | 'inactive' | 'lead' | 'duplicate';
  vat_number?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  collaborators?: Collaborator[];
  user_id?: string;
  has_user_account?: boolean;
  user_account_created_at?: string | Date;
  is_ambassador_client?: boolean;
  createdAt?: string;
  totalValue?: number;
  ambassador_client_id?: string;
  contact_name?: string;
  default_leaser_id?: string;
  has_custom_catalog?: boolean;
  logo_url?: string;
}

export interface CreateClientData {
  id?: string;
  name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  company?: string;
  phone?: string;
  address?: string;
  billing_address?: string;
  billing_city?: string;
  billing_postal_code?: string;
  billing_country?: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_postal_code?: string;
  delivery_country?: string;
  delivery_same_as_billing?: boolean;
  notes?: string;
  user_id?: string;
  status?: 'active' | 'inactive' | 'lead' | 'duplicate';
  vat_number?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  collaborators?: Collaborator[];
  is_ambassador_client?: boolean;
  contact_name?: string;
  default_leaser_id?: string;
  logo_url?: string;
}
