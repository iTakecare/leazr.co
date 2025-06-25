
import { useMemo } from "react";
import { useCommissionCalculator } from "./useCommissionCalculator";

interface OfferCommissionCalculatorProps {
  isInternalOffer: boolean;
  selectedAmbassadorId?: string;
  commissionLevelId?: string;
  totalMargin: number;
  equipmentListLength: number;
  totalMonthlyPayment: number;
}

export const useOfferCommissionCalculator = ({
  isInternalOffer,
  selectedAmbassadorId,
  commissionLevelId,
  totalMargin,
  equipmentListLength,
  totalMonthlyPayment
}: OfferCommissionCalculatorProps) => {
  
  // Pour les offres internes, pas de commission
  const shouldCalculateCommission = !isInternalOffer && selectedAmbassadorId;
  
  const commission = useCommissionCalculator(
    totalMonthlyPayment,
    shouldCalculateCommission ? selectedAmbassadorId : undefined,
    shouldCalculateCommission ? commissionLevelId : undefined,
    equipmentListLength,
    shouldCalculateCommission ? totalMargin : 0
  );

  // Retourner les données de commission appropriées
  return useMemo(() => {
    if (isInternalOffer) {
      return {
        amount: 0,
        rate: 0,
        levelName: "",
        isCalculating: false
      };
    }
    
    return commission;
  }, [isInternalOffer, commission]);
};
