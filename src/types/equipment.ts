
export interface Equipment {
  id: string;
  title: string;
  purchasePrice: number;
  quantity: number;
  margin: number;
  monthlyPayment?: number;
}

export interface Leaser {
  id: string;
  name: string;
  logo_url?: string;
  ranges: LeaserRange[];
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
  marginDifference: number; // New field to track margin difference
}
