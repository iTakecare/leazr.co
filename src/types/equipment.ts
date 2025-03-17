
export interface Equipment {
  items: EquipmentItem[];
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
}
