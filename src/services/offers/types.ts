
export interface OfferData {
  id?: string;
  client_id: string;
  client_name: string;
  client_email?: string;
  client_company?: string; // Optional field, used only for display/session storage, not sent to DB
  equipment_description?: string;
  amount: number | string; // Allow for both number and string types
  coefficient: number | string; // Allow for both number and string types
  monthly_payment: number | string; // Allow for both number and string types
  commission?: number | string; // Allow for both number and string types
  commission_status?: string;
  commission_paid_at?: string; 
  ambassador_id?: string;
  type?: string;
  workflow_status?: string;
  status?: string;
  remarks?: string; // Used for additional info or notes
  additional_info?: string; // Alternative field name for remarks
  user_id?: string;
  converted_to_contract?: boolean;
  financed_amount?: number; // Added this field
  created_at?: string; // Make created_at optional in OfferData but include it
  clients?: {
    id?: string;
    name?: string;
    email?: string;
    company?: string;
  };
}

export interface RequestInfoData {
  offerId: string;
  previousStatus: string;
  requestedDocs: string[];
  message?: string;
}

export enum OfferStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

export enum OfferWorkflowStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  REQUESTED_INFO = 'requested_info',
  CLIENT_WAITING = 'client_waiting',
  SIGNED = 'signed',
  ARCHIVED = 'archived',
  REJECTED = 'rejected'
}

export interface OfferWorkflowStatusUpdate {
  offerId: string;
  newStatus: OfferWorkflowStatus;
  previousStatus: string;
  reason?: string;
}

export interface OfferStatusCounts {
  draft: number;
  sent: number;
  requested_info: number;
  client_waiting: number;
  signed: number;
  archived: number;
  rejected: number;
  total: number;
}

export enum OfferType {
  ADMIN = 'admin_offer',
  PARTNER = 'partner_offer',
  AMBASSADOR = 'ambassador_offer',
  CLIENT = 'client_request',
  INTERNAL = 'internal_offer'
}
