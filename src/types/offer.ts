
export interface Offer {
  id: string;
  client_id: string;
  client_name: string;
  clientName?: string;
  clientCompany?: string;
  equipment_description?: string;
  amount: number;
  monthly_payment: number;
  coefficient?: number;
  commission?: number;
  commission_status?: string;
  commission_paid_at?: string;
  ambassador_id?: string;
  type?: string;
  workflow_status?: string;
  status?: string;
  remarks?: string;
  additional_info?: string;
  user_id?: string;
  converted_to_contract?: boolean;
  financed_amount?: number;
  created_at: string;
  clients?: {
    id?: string;
    name?: string;
    email?: string;
    company?: string;
  };
  signature_data?: string;
  signer_name?: string;
  signed_at?: string;
  signer_ip?: string;
  equipment_data?: any[];
}
