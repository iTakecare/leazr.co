
export interface RequestInfoData {
  offerId: string;
  requestedDocs: string[];
  customMessage?: string;
  previousStatus: string;
}

export interface OfferData {
  id?: string;
  client_id?: string;
  client_name: string;
  client_email?: string;
  client_company?: string;
  equipment_description?: string;
  equipment_text?: string;
  amount?: number;
  monthly_payment?: number;
  coefficient?: number;
  commission?: number | null;
  commission_status?: string;
  ambassador_id?: string;
  workflow_status?: string;
  status?: string;
  type?: OfferType;
  remarks?: string;
  additional_info?: string;
  user_id?: string;
  converted_to_contract?: boolean;
  financed_amount?: number;
  margin?: string;
  total_margin_with_difference?: string;
  created_at?: string;
  updated_at?: string;
}

export type OfferType = 'internal_offer' | 'partner_offer' | 'ambassador_offer' | 'direct_offer';
