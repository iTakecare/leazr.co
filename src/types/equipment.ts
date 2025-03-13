
export interface Equipment {
  id: string;
  title: string;
  purchasePrice: number;
  quantity: number;
  margin: number;
}

export interface Leaser {
  id: string;
  name: string;
  logo_url?: string | null;
  ranges: {
    id: string;
    min: number;
    max: number;
    coefficient: number;
  }[];
}

export interface GlobalMarginAdjustment {
  percentage: number;
  amount: number;
  newMonthly: number;
  currentCoef: number;
  newCoef: number;
}
