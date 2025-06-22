
import { useState, useEffect } from 'react';
import { calculateCommissionByLevel, calculateFinancedAmount } from '@/utils/calculator';

interface CommissionData {
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
): CommissionData => {
  const [commission, setCommission] = useState<CommissionData>({
    amount: 0,
    rate: 0,
    levelName: '',
    isCalculating: false
  });

  useEffect(() => {
    const calculateCommission = async () => {
      if (totalMonthlyPayment <= 0 || equipmentListLength === 0) {
        setCommission({ amount: 0, rate: 0, levelName: '', isCalculating: false });
        return;
      }

      setCommission(prev => ({ ...prev, isCalculating: true }));

      try {
        console.log("Calculating commission with:", {
          totalMonthlyPayment,
          ambassadorId,
          commissionLevelId,
          equipmentListLength
        });

        // Calculer le montant financé avec coefficient par défaut
        const financedAmount = calculateFinancedAmount(totalMonthlyPayment, 3.27);
        
        // Calculer la commission avec un fallback
        let commissionAmount = 0;
        let commissionRate = 0;
        let levelName = '';

        // Vérifier que nous avons bien un ambassadorId ET un commissionLevelId
        if (ambassadorId && commissionLevelId) {
          try {
            console.log("Using ambassador commission calculation with level:", commissionLevelId);
            const commissionData = await calculateCommissionByLevel(
              financedAmount,
              commissionLevelId,
              'ambassador',
              ambassadorId
            );
            
            commissionAmount = commissionData.amount || 0;
            commissionRate = commissionData.rate || 0;
            levelName = commissionData.levelName || 'Barème ambassadeur';
            
            console.log("Commission calculated successfully:", {
              amount: commissionAmount,
              rate: commissionRate,
              levelName
            });
          } catch (error) {
            console.error("Error calculating commission with level:", error);
            // Fallback: 5% du montant financé
            commissionAmount = Math.round(financedAmount * 0.05);
            commissionRate = 5;
            levelName = 'Commission par défaut (erreur)';
          }
        } else {
          console.log("Missing ambassadorId or commissionLevelId, using default calculation");
          // Fallback: 5% du montant financé
          commissionAmount = Math.round(financedAmount * 0.05);
          commissionRate = 5;
          levelName = ambassadorId ? 'Aucun barème attribué' : 'Aucun ambassadeur associé';
        }

        setCommission({
          amount: commissionAmount,
          rate: commissionRate,
          levelName,
          isCalculating: false
        });

      } catch (error) {
        console.error("Error in commission calculation:", error);
        // Fallback final
        const fallbackAmount = Math.round(totalMonthlyPayment * 15); // Approximation
        setCommission({
          amount: fallbackAmount,
          rate: 5,
          levelName: 'Commission estimée (erreur)',
          isCalculating: false
        });
      }
    };

    const timer = setTimeout(calculateCommission, 300);
    return () => clearTimeout(timer);
  }, [totalMonthlyPayment, ambassadorId, commissionLevelId, equipmentListLength]);

  return commission;
};
