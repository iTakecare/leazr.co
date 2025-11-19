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
    // Use exact Grenke coefficient as fallback - for 7000€ range (5000.01-12500)
    return 3.16;
  }

  // Find the range that contains the amount
  const matchingRange = leaser.ranges.find(range => 
    amount >= range.min && amount <= range.max
  );

  if (!matchingRange) {
    // If no range matches, use first range coefficient or exact Grenke fallback
    return leaser.ranges[0]?.coefficient || 3.16;
  }

  // If the range has duration coefficients, use them (priority)
  if (matchingRange.duration_coefficients && matchingRange.duration_coefficients.length > 0) {
    const durationCoeff = matchingRange.duration_coefficients.find(
      dc => dc.duration_months === duration
    );
    
    if (durationCoeff) {
      return durationCoeff.coefficient;
    }
  }

  // Fallback to the range's base coefficient
  return matchingRange.coefficient || 3.16;
};

/**
 * Get the maximum coefficient from all ranges and durations of a leaser
 * Used when creating offers with "Produits à déterminer" to be conservative
 */
export const getMaxCoefficientFromLeaser = (leaser: Leaser | null): number => {
  if (!leaser || !leaser.ranges || leaser.ranges.length === 0) {
    // Fallback: 3.55 is the maximum coefficient found across all leasers
    return 3.55;
  }

  let maxCoefficient = 0;

  // Iterate through all ranges of the leaser
  leaser.ranges.forEach(range => {
    // Check the base coefficient of the range
    if (range.coefficient && range.coefficient > maxCoefficient) {
      maxCoefficient = range.coefficient;
    }

    // Check all duration_coefficients of the range
    if (range.duration_coefficients && range.duration_coefficients.length > 0) {
      range.duration_coefficients.forEach(dc => {
        if (dc.coefficient > maxCoefficient) {
          maxCoefficient = dc.coefficient;
        }
      });
    }
  });

  // If no coefficient found, use the fallback of 3.55
  return maxCoefficient > 0 ? maxCoefficient : 3.55;
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
  let estimatedAmount = (monthlyPrice * 100) / 3.16; // Use exact Grenke coefficient for initial estimate
  
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