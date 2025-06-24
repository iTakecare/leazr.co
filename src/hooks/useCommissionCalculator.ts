
import { useState, useEffect } from "react";
import { calculateAmbassadorCommission } from "@/services/ambassadorCommissionService";

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
  equipmentListLength: number = 0,
  totalMargin?: number
): CommissionResult => {
  const [commission, setCommission] = useState<CommissionResult>({
    amount: 0,
    rate: 0,
    levelName: "",
    isCalculating: false
  });

  useEffect(() => {
    const fetchCommission = async () => {
      console.log("useCommissionCalculator - Starting calculation with:", {
        totalMonthlyPayment,
        ambassadorId,
        commissionLevelId,
        equipmentListLength,
        totalMargin
      });

      if (!ambassadorId || totalMonthlyPayment <= 0 || equipmentListLength === 0 || !totalMargin || totalMargin <= 0) {
        console.log("useCommissionCalculator - Missing required data, resetting to zero");
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
        console.log("useCommissionCalculator - Calling calculateAmbassadorCommission with:", {
          ambassadorId,
          totalMargin
        });

        const result = await calculateAmbassadorCommission(ambassadorId, totalMargin);

        console.log("useCommissionCalculator - Commission result:", result);

        if (result) {
          setCommission({
            amount: result.amount || 0,
            rate: result.rate || 0,
            levelName: result.levelName || "",
            isCalculating: false
          });
        } else {
          console.log("useCommissionCalculator - No result returned");
          setCommission({
            amount: 0,
            rate: 0,
            levelName: "",
            isCalculating: false
          });
        }
      } catch (error) {
        console.error("useCommissionCalculator - Error calculating commission:", error);
        setCommission({
          amount: 0,
          rate: 0,
          levelName: "",
          isCalculating: false
        });
      }
    };

    fetchCommission();
  }, [totalMonthlyPayment, ambassadorId, commissionLevelId, equipmentListLength, totalMargin]);

  return commission;
};
