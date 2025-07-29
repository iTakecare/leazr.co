import { Leaser } from "@/types/equipment";

/**
 * Get the coefficient for a specific amount and duration from a leaser's ranges
 */
export const getCoefficientFromLeaser = (
  leaser: Leaser | null,
  amount: number,
  duration: number = 36
): number => {
  if (!leaser || !leaser.ranges || leaser.ranges.length === 0) {
    // Fallback to default coefficient if no leaser or ranges
    return 2.8;
  }

  // Find the range that contains the amount
  const matchingRange = leaser.ranges.find(range => 
    amount >= range.min && amount <= range.max
  );

  if (!matchingRange) {
    // If no range matches, use the first range's coefficient as fallback
    return leaser.ranges[0]?.coefficient || 2.8;
  }

  // If the range has duration coefficients, use them
  if (matchingRange.duration_coefficients && matchingRange.duration_coefficients.length > 0) {
    const durationCoeff = matchingRange.duration_coefficients.find(
      dc => dc.duration_months === duration
    );
    
    if (durationCoeff) {
      return durationCoeff.coefficient;
    }
  }

  // Fallback to the range's base coefficient
  return matchingRange.coefficient;
};

/**
 * Calculate the financed amount (montant financé) using the leaser's specific coefficient
 */
export const calculateSalePriceWithLeaser = (
  monthlyPrice: number,
  leaser: Leaser | null,
  duration: number = 36
): number => {
  // Start with a reasonable estimate for the financed amount to find the correct coefficient
  // We estimate the financed amount first, then iterate to find the precise coefficient
  let estimatedAmount = (monthlyPrice * 100) / 2.8; // Use default coefficient for initial estimate
  
  // Get coefficient based on the estimated financed amount
  let coefficient = getCoefficientFromLeaser(leaser, estimatedAmount, duration);
  
  // Calculate the actual financed amount with the correct coefficient
  let financedAmount = (monthlyPrice * 100) / coefficient;
  
  // If the calculated amount is significantly different from our estimate, 
  // recalculate the coefficient with the new amount to ensure we're in the right range
  if (Math.abs(financedAmount - estimatedAmount) > estimatedAmount * 0.1) {
    coefficient = getCoefficientFromLeaser(leaser, financedAmount, duration);
    financedAmount = (monthlyPrice * 100) / coefficient;
  }
  
  return financedAmount;
};