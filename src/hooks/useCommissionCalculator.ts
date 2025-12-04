
import { useState, useEffect, useMemo, useRef } from "react";
import { calculateAmbassadorCommission, EquipmentItem } from "@/services/ambassadorCommissionService";

interface CommissionResult {
  amount: number;
  rate: number;
  levelName: string;
  isCalculating: boolean;
  pcCount?: number;
}

export const useCommissionCalculator = (
  totalMonthlyPayment: number,
  ambassadorId?: string,
  commissionLevelId?: string,
  equipmentList: EquipmentItem[] = [],
  totalMargin?: number,
  totalPurchaseAmount?: number
): CommissionResult => {
  const [commission, setCommission] = useState<CommissionResult>({
    amount: 0,
    rate: 0,
    levelName: "",
    isCalculating: false
  });

  const timeoutRef = useRef<NodeJS.Timeout>();

  // Stabiliser equipmentList par sérialisation pour éviter les recalculs inutiles
  const equipmentKey = useMemo(() => 
    JSON.stringify(equipmentList.map(e => ({
      product_id: e.product_id,
      category_id: e.category_id,
      title: e.title,
      quantity: e.quantity
    }))), 
    [equipmentList]
  );

  useEffect(() => {
    // Annuler le timeout précédent
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Validation rapide - pas de debounce nécessaire
    if (!ambassadorId || totalMonthlyPayment <= 0 || equipmentList.length === 0 || (!totalMargin || totalMargin <= 0)) {
      setCommission({
        amount: 0,
        rate: 0,
        levelName: "",
        isCalculating: false
      });
      return;
    }

    setCommission(prev => ({ ...prev, isCalculating: true }));

    // Debounce de 500ms avant d'appeler l'API
    timeoutRef.current = setTimeout(async () => {
      try {
        const result = await calculateAmbassadorCommission(
          ambassadorId, 
          totalMargin, 
          totalPurchaseAmount, 
          totalMonthlyPayment, 
          equipmentList
        );

        if (result) {
          setCommission({
            amount: result.amount || 0,
            rate: result.rate || 0,
            levelName: result.levelName || "",
            isCalculating: false,
            pcCount: result.pcCount
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
        console.error("useCommissionCalculator - Error calculating commission:", error);
        setCommission({
          amount: 0,
          rate: 0,
          levelName: "",
          isCalculating: false
        });
      }
    }, 500);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [totalMonthlyPayment, ambassadorId, commissionLevelId, equipmentKey, totalMargin, totalPurchaseAmount]);

  return commission;
};
