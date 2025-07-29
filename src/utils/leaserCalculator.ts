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
 * Calculate the sale price using the leaser's specific coefficient
 */
export const calculateSalePriceWithLeaser = (
  monthlyPrice: number,
  leaser: Leaser | null,
  duration: number = 36
): number => {
  // Calculate total payments over the duration
  const totalPayments = monthlyPrice * duration;
  
  // Get coefficient based on total payments amount
  const coefficient = getCoefficientFromLeaser(leaser, totalPayments, duration);
  
  // Calculate sale price: total payments / coefficient
  return totalPayments / coefficient;
};