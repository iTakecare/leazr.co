
import { useMemo } from "react";
import { useCommissionCalculator } from "./useCommissionCalculator";
import { EquipmentItem } from "@/services/ambassadorCommissionService";

interface OfferCommissionCalculatorProps {
  isInternalOffer: boolean;
  selectedAmbassadorId?: string;
  commissionLevelId?: string;
  totalMargin: number;
  equipmentList?: EquipmentItem[];
  totalMonthlyPayment: number;
  totalPurchaseAmount?: number;
}

export const useOfferCommissionCalculator = ({
  isInternalOffer,
  selectedAmbassadorId,
  commissionLevelId,
  totalMargin,
  equipmentList = [],
  totalMonthlyPayment,
  totalPurchaseAmount
}: OfferCommissionCalculatorProps) => {
  
  // Pour les offres internes, pas de commission
  const shouldCalculateCommission = !isInternalOffer && selectedAmbassadorId;
  
  const commission = useCommissionCalculator(
    totalMonthlyPayment,
    shouldCalculateCommission ? selectedAmbassadorId : undefined,
    shouldCalculateCommission ? commissionLevelId : undefined,
    equipmentList,
    shouldCalculateCommission ? totalMargin : 0,
    shouldCalculateCommission ? totalPurchaseAmount : undefined
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
