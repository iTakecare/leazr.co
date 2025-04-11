
export interface Equipment {
  id: string;
  title: string;
  purchasePrice: number;
  quantity: number;
  margin: number;
  monthlyPayment?: number;
  attributes?: Record<string, string>;
  specifications?: Record<string, string | number>;
}

export interface Leaser {
  id: string;
  name: string;
  logoUrl?: string;
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
}
