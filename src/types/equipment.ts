
export interface Equipment {
  id: string;
  title: string;
  purchasePrice: number;
  quantity: number;
  margin: number;
  monthlyPayment?: number;
  attributes?: Record<string, string>;
  specifications?: Record<string, string | number>;
  // Add properties needed for ClientEquipmentPage
  assignedTo?: string | null;
  role?: string;
  assignedDate?: string;
  status?: string;
  serial?: string;
}

export interface Leaser {
  id: string;
  name: string;
  logoUrl?: string;
  logo_url?: string; // Add for backward compatibility
  ranges: LeaserRange[];
}

export interface LeaserRange {
  id: string;
  min: number;
  max: number;
  coefficient: number;
}

export interface GlobalMarginAdjustment {
  amount: number;
  newCoef: number;
  newMonthly: number;
  adaptMonthlyPayment: boolean;
  marginDifference?: number;
  percentage?: number; // Add missing percentage property
  currentCoef?: number; // Add optional property used in calculator
}
