
export interface Equipment {
  id: string;
  title: string;
  purchasePrice: number;
  quantity: number;
  margin: number;
  monthlyPayment?: number;
  productId?: string;
  categoryId?: string;
  imageUrl?: string;
  image_url?: string;
  image_urls?: string[];
  attributes?: Record<string, any>; // Attributs sélectionnés (couleur, taille, etc.)
  specifications?: Record<string, any>; // Spécifications techniques du produit
  // Division fields
  parentEquipmentId?: string;
  isIndividual?: boolean;
  individualSerialNumber?: string;
  // Delivery information fields
  collaboratorId?: string;
  deliverySiteId?: string;
  deliveryType?: 'main_client' | 'collaborator' | 'predefined_site' | 'specific_address';
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryPostalCode?: string;
  deliveryCountry?: string;
  deliveryContactName?: string;
  deliveryContactEmail?: string;
  deliveryContactPhone?: string;
}

export interface DurationCoefficient {
  duration_months: number;
  coefficient: number;
}

export interface Leaser {
  id: string;
  name: string;
  company_name?: string;
  logo_url?: string;
  ranges: LeasingRange[];
  available_durations?: number[];
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  vat_number?: string;
  phone?: string;
  email?: string;
  billing_frequency?: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  contract_start_rule?: 
    | 'next_month_first' 
    | 'next_quarter_first' 
    | 'next_semester_first' 
    | 'next_year_first' 
    | 'delivery_date' 
    | 'delivery_date_plus_15';
}

export interface LeasingRange {
  id: string;
  min: number;
  max: number;
  coefficient?: number; // Garde pour compatibilité descendante
  duration_coefficients?: DurationCoefficient[];
}

export interface LeaserRange {
  id: string;
  min: number;
  max: number;
  coefficient?: number; // Garde pour compatibilité descendante
  duration_coefficients?: DurationCoefficient[];
}

export interface LeaserDurationCoefficient {
  id: string;
  leaser_range_id: string;
  duration_months: number;
  coefficient: number;
}

export interface GlobalMarginAdjustment {
  percentage: number;
  amount: number;
  newMonthly: number;
  currentCoef: number;
  newCoef: number;
  adaptMonthlyPayment: boolean;
  marginDifference: number;
}
