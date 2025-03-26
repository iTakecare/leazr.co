
export interface EquipmentItem {
  id: string;
  title: string;
  purchasePrice: number;
  quantity: number;
  margin: number;
}

export interface OfferData {
  client_name: string;
  client_email: string;
  client_id?: string;
  equipment_description?: string;
  amount: number;
  coefficient: number;
  monthly_payment: number;
  commission: number;
  user_id: string;
  type?: string;
  remarks?: string;
  workflow_status?: string;
}

export interface RequestInfoData {
  offerId: string;
  requestedDocs: string[];
  customMessage: string;
  previousStatus: string;
}

// Add these missing types
export type Equipment = EquipmentItem;

export enum OfferStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  INFO_REQUESTED = 'info_requested',
  LEASER_REVIEW = 'leaser_review',
  CONVERTED = 'converted'
}

export enum WorkflowStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  INFO_REQUESTED = 'info_requested',
  LEASER_REVIEW = 'leaser_review',
  CONVERTED = 'converted'
}
