
export interface Contract {
  id: string;
  client_id: string;
  client_name: string;
  equipment_description?: string;
  monthly_payment: number;
  status: string;
  leaser_name: string;
  leaser_logo?: string;
  created_at: string;
  tracking_number?: string;
  estimated_delivery?: string;
  delivery_carrier?: string;
  delivery_status?: string;
  user_id?: string;
}
