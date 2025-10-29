import { Leaser } from '@/types/equipment';
import { getCoefficientFromLeaser, calculateSalePriceWithLeaser } from './leaserCalculator';

export interface DurationResult {
  purchasePrice: number;
  monthlyPayment: number;
  coefficient: number;
}

export interface AllDurationResults {
  [duration: number]: DurationResult;
}

/**
 * Calculate monthly rent from purchase price
 */
export const calculateRentFromPurchasePrice = (
  purchasePrice: number,
  leaser: Leaser | null,
  duration: number
): number => {
  const coefficient = getCoefficientFromLeaser(leaser, purchasePrice, duration);
  return (purchasePrice * coefficient) / 100;
};

/**
 * Calculate purchase price from monthly rent
 */
export const calculatePurchasePriceFromRent = (
  monthlyRent: number,
  leaser: Leaser | null,
  duration: number
): number => {
  return calculateSalePriceWithLeaser(monthlyRent, leaser, duration);
};

/**
 * Calculate results for all durations
 */
export const calculateAllDurations = (
  amount: number,
  mode: 'purchase_price' | 'rent',
  leaser: Leaser | null,
  durations: number[] = [18, 24, 36, 48, 60]
): AllDurationResults => {
  const results: AllDurationResults = {};
  
  durations.forEach(duration => {
    if (mode === 'purchase_price') {
      const coefficient = getCoefficientFromLeaser(leaser, amount, duration);
      results[duration] = {
        purchasePrice: amount,
        monthlyPayment: (amount * coefficient) / 100,
        coefficient
      };
    } else {
      const purchasePrice = calculateSalePriceWithLeaser(amount, leaser, duration);
      const coefficient = getCoefficientFromLeaser(leaser, purchasePrice, duration);
      results[duration] = {
        purchasePrice,
        monthlyPayment: amount,
        coefficient
      };
    }
  });
  
  return results;
};
