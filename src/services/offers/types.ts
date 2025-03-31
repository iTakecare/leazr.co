
export interface OfferData {
  id?: string;
  client_id: string;
  client_name: string;
  client_email?: string;
  equipment_description?: string;
  amount: number;
  coefficient: number;
  monthly_payment: number;
  commission?: number;
  type?: string;
  workflow_status?: string;
  status?: string;
  remarks?: string;
  user_id?: string;
  client_company?: string; // Optional field, used only for display/session storage, not sent to DB
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
