
// If this file doesn't exist yet, we'll create it
export interface OfferData {
  client_id: string;
  client_name: string;
  client_email?: string;
  equipment_description?: string;
  amount: number;
  monthly_payment: number;
  coefficient: number;
  commission?: number;
  user_id?: string | null;
  type?: string;
  status?: string;
  workflow_status?: string;
  remarks?: string;
  id?: string;
  created_at?: string;
  updated_at?: string;
}
