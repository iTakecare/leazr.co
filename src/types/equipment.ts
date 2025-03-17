
import { Leaser } from './leaser';

export interface EquipmentItem {
  id: string;
  title: string;
  description?: string;
  purchasePrice: number;
  quantity: number;
  margin: number;
  total_price: number;
  monthlyPayment?: number;
  name?: string;  // Adding this for backward compatibility
  unit_price?: number; // Adding this for backward compatibility
}

export interface Equipment {
  id?: string;
  title: string;
  purchasePrice: number;
  quantity: number;
  margin: number;
  monthlyPayment?: number;
  items: EquipmentItem[];
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

// Re-export the Leaser type to ensure compatibility
export type { Leaser, LeaserRange } from './leaser';
