
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
  client_company?: string;
}

export interface Equipment {
  id: string;
  title: string;
  purchasePrice: number;
  quantity: number;
  margin: number;
  monthlyPayment?: number;
}

export interface RequestInfoData {
  offerId: string;
  previousStatus: string;
  requestedDocs: string[];
  message?: string;
  customMessage?: string; // Added for backward compatibility
}

// Enum for different offer statuses
export enum OfferStatus {
  DRAFT = "draft",
  SENT = "sent",
  APPROVED = "approved",
  REJECTED = "rejected",
  INFO_REQUESTED = "info_requested",
  VALID_ITC = "valid_itc",
  LEASER_REVIEW = "leaser_review",
  FINANCED = "financed",
}

// Enum for workflow statuses
export enum WorkflowStatus {
  DRAFT = "draft",
  SENT = "sent",
  CLIENT_WAITING = "client_waiting",
  INFO_REQUESTED = "info_requested",
  LEASER_REVIEW = "leaser_review",
  APPROVED = "approved",
  REJECTED = "rejected",
  FINANCED = "financed",
  REQUESTED = "requested",
}
