
/**
 * Type représentant les données d'une offre dans le système
 */
export interface OfferData {
  id: string;
  client_id?: string;
  client_name: string;
  client_email?: string;
  equipment_description?: string;
  amount: number;
  monthly_payment: number;
  coefficient?: number;
  commission?: number;
  commission_status?: string;
  type?: string;
  workflow_status: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
  ambassador_id?: string;
  converted_to_contract?: boolean;
  financed_amount?: number;
  remarks?: string;
  additional_info?: string;
  signature_data?: string;
  signed_at?: string;
  signer_name?: string;
  signer_ip?: string;
  clients?: {
    id?: string;
    name?: string;
    email?: string;
    company?: string;
  };
}
