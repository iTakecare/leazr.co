
export interface Equipment {
  id: string;
  title: string;
  purchasePrice: number;
  quantity: number;
  margin: number;
  monthlyPayment?: number;
  attributes?: Record<string, any>; // Attributs sélectionnés (couleur, taille, etc.)
  specifications?: Record<string, any>; // Spécifications techniques du produit
}

export interface Leaser {
  id: string;
  name: string;
  company_name?: string;
  logo_url?: string;
  ranges: LeasingRange[];
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  vat_number?: string;
  phone?: string;
  email?: string;
}

export interface LeasingRange {
  id: string;
  min: number;
  max: number;
  coefficient: number;
}

export interface LeaserRange {
  id: string;
  min: number;
  max: number;
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
