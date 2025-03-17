
export interface Equipment {
  items: EquipmentItem[];
  id?: string;
  title?: string;
  purchasePrice?: number;
  quantity?: number;
  margin?: number;
  monthlyPayment?: number;
}

export interface EquipmentItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  category: string;
  description?: string;
  reference?: string;
  brand?: string;
}

export interface GlobalMarginAdjustment {
  enabled: boolean;
  originalAmount: number;
  originalCoef: number;
  originalMonthly: number;
  adjustmentPercent: number;
  percentage?: number;
  amount?: number;
  newMonthly?: number;
  currentCoef?: number;
  newCoef?: number;
  adaptMonthlyPayment?: boolean;
  marginDifference?: number;
}
