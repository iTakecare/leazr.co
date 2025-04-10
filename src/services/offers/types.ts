
export interface RequestInfoData {
  offerId: string;
  requestedDocs: string[];
  customMessage?: string;
  previousStatus: string;
}

export type OfferType = 'admin_offer' | 'internal_offer' | 'partner_offer' | 'ambassador_offer';

export interface OfferData {
  client_id: string;
  client_name: string;
  client_email: string;
  equipment_description: string;
  amount: number;
  coefficient: number;
  monthly_payment: number;
  commission: number;
  financed_amount: number;
  workflow_status: string;
  type: OfferType;
  user_id: string;
  remarks?: string;
  total_margin_with_difference?: string | number;
  margin?: string | number;
  id?: string;
  created_at?: string;
  ambassador_id?: string;
  previous_status?: string;
  signature_data?: string;
  signer_name?: string;
  signer_ip?: string;
  signed_at?: string;
  commission_status?: string;
  status?: string;
  equipment_text?: string;
  additional_info?: string;
}
