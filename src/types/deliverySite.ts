export interface DeliverySite {
  id: string;
  client_id: string;
  site_name: string;
  address: string;
  city: string;
  postal_code?: string;
  country: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  is_default?: boolean;
  is_active?: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateDeliverySiteData {
  client_id: string;
  site_name: string;
  address: string;
  city: string;
  postal_code?: string;
  country: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  is_default?: boolean;
  notes?: string;
}