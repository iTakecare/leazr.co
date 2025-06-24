
import { useState, useEffect } from "react";
import { calculateCommissionByLevel } from "@/utils/calculator";

interface CommissionResult {
  amount: number;
  rate: number;
  levelName: string;
  isCalculating: boolean;
}

export const useCommissionCalculator = (
  totalMonthlyPayment: number,
  ambassadorId?: string,
  commissionLevelId?: string,
  equipmentListLength: number = 0
): CommissionResult => {
  const [commission, setCommission] = useState<CommissionResult>({
    amount: 0,
    rate: 0,
    levelName: "",
    isCalculating: false
  });

  useEffect(() => {
    const fetchCommission = async () => {
      if (!ambassadorId || !commissionLevelId || totalMonthlyPayment <= 0 || equipmentListLength === 0) {
        setCommission({
          amount: 0,
          rate: 0,
          levelName: "",
          isCalculating: false
        });
        return;
      }

      setCommission(prev => ({ ...prev, isCalculating: true }));

      try {
        // Calculer le montant financé approximatif (mensualité * coefficient standard)
        const approximateFinancedAmount = totalMonthlyPayment * 36; // Coefficient moyen

        const result = await calculateCommissionByLevel(
          approximateFinancedAmount,
          commissionLevelId,
          'ambassador',
          ambassadorId
        );

        if (result) {
          setCommission({
            amount: result.amount || 0,
            rate: result.rate || 0,
            levelName: result.levelName || "",
            isCalculating: false
          });
        } else {
          setCommission({
            amount: 0,
            rate: 0,
            levelName: "",
            isCalculating: false
          });
        }
      } catch (error) {
        console.error("Erreur lors du calcul de la commission:", error);
        setCommission({
          amount: 0,
          rate: 0,
          levelName: "",
          isCalculating: false
        });
      }
    };

    fetchCommission();
  }, [totalMonthlyPayment, ambassadorId, commissionLevelId, equipmentListLength]);

  return commission;
};
