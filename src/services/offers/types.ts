export interface OfferData {
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
  remarks?: string; // Utiliser 'remarks' au lieu de 'additional_info'
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
  signature_data?: string;
  signer_name?: string;
  signed_at?: string;
  signer_ip?: string;
  margin?: number | string; // Ajout de cette propriété pour résoudre les erreurs
  company_id: string; // Champ obligatoire pour la base de données
  margin_difference?: number; // Différence de marge calculée
  total_margin_with_difference?: number; // Marge totale avec différence
  dossier_number?: string; // Numéro de dossier
  source?: string; // Canal d'acquisition (recommandation, Google, client existant, etc.)
  leaser_id?: string; // ID du bailleur sélectionné
  duration?: number; // Durée du financement en mois
  business_sector?: string; // Secteur d'activité de l'offre
  file_fee?: number; // Frais de dossier
  annual_insurance?: number; // Assurance annuelle
  is_purchase?: boolean; // true = achat direct (sans financement), false = leasing (défaut)
  // Equipment is used for processing but not sent to DB directly
  equipment?: Array<{
    id?: string;
    title: string;
    purchasePrice?: number;
    purchase_price?: number;
    quantity: number;
    margin: number;
    monthlyPayment?: number;
    monthly_payment?: number;
    sellingPrice?: number;
    selling_price?: number;
    serialNumber?: string;
    serial_number?: string;
    productId?: string;
    product_id?: string;
    imageUrl?: string;
    image_url?: string;
    image_urls?: string[];
    attributes?: Record<string, any>;
    specifications?: Record<string, any>;
  }>;
  products_to_be_determined?: boolean; // Flag pour créer une offre sans produits spécifiques
  estimated_budget?: number; // Budget estimé quand les produits ne sont pas définis
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

export interface RequestInfoData {
  offerId: string;
  previousStatus: string;
  requestedDocs: string[];
  message?: string;
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
  AMBASSADOR = 'ambassador_offer',
  CLIENT = 'client_request',
  INTERNAL = 'internal_offer',
  DIRECT = 'direct_offer',
  WEB_REQUEST = 'web_request',
  CUSTOM_PACK_REQUEST = 'custom_pack_request'
}
