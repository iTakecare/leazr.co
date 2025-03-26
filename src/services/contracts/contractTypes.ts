
// Types pour les contrats
export const contractStatuses = {
  CONTRACT_SENT: "contract_sent",
  CONTRACT_SIGNED: "contract_signed",
  EQUIPMENT_ORDERED: "equipment_ordered",
  DELIVERED: "delivered",
  ACTIVE: "active",
  COMPLETED: "completed"
};

export interface Contract {
  id: string;
  offer_id: string;
  client_name: string;
  client_id?: string;
  client_email?: string;
  client_phone?: string;
  clients?: {
    name: string;
    email: string;
    company: string;
  } | null;
  monthly_payment: number;
  amount?: number;
  lease_duration?: number;
  equipment_description?: string;
  status: string;
  leaser_name: string;
  leaser_logo?: string;
  created_at: string;
  updated_at?: string;
  tracking_number?: string;
  estimated_delivery?: string;
  delivery_status?: string;
  delivery_carrier?: string;
}

export interface ContractCreateData {
  offer_id: string;
  client_name: string;
  client_id?: string;
  monthly_payment: number;
  equipment_description?: string;
  leaser_name: string;
  leaser_logo?: string;
  user_id: string;
}
