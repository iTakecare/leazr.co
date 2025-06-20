
import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Loader2 } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { calculateFinancedAmount, getCoefficientRateSync, getCoefficientRate } from "@/utils/calculator";

interface AmbassadorCommissionPreviewProps {
  totalMonthlyPayment: number;
  ambassadorId?: string;
  commissionLevelId?: string;
  equipmentList: any[];
}

const AmbassadorCommissionPreview = ({
  totalMonthlyPayment,
  ambassadorId,
  commissionLevelId,
  equipmentList
}: AmbassadorCommissionPreviewProps) => {
  const [commission, setCommission] = useState<{ amount: number; rate: number; levelName: string }>({
    amount: 0,
    rate: 0,
    levelName: ""
  });
  const [isCalculating, setIsCalculating] = useState(false);
  const [hasAttemptedCalculation, setHasAttemptedCalculation] = useState(false);
  const calculationRequestedRef = useRef(false);
  const totalPaymentRef = useRef(0);
  
  const canCalculateCommission = totalMonthlyPayment > 0 && equipmentList.length > 0;
  
  useEffect(() => {
    if (!canCalculateCommission) return;
    
    const newTotalMonthlyPayment = totalMonthlyPayment || 0;
    if (Math.abs(totalPaymentRef.current - newTotalMonthlyPayment) < 0.01 && hasAttemptedCalculation) return;
    
    totalPaymentRef.current = newTotalMonthlyPayment;
    calculationRequestedRef.current = true;
    setHasAttemptedCalculation(true);
    
    const calculateCommission = async () => {
      setIsCalculating(true);
      
      try {
        console.log("Calculating commission with params:", {
          totalMonthlyPayment,
          ambassadorId,
          commissionLevelId,
          equipmentCount: equipmentList.length
        });
        
        const { calculateCommissionByLevel } = await import('@/utils/calculator');
        
        let initialCoefficient = 3.27;
        let financedAmount = calculateFinancedAmount(newTotalMonthlyPayment, initialCoefficient);
        
        const preciseCoefficient = await getCoefficientRate(financedAmount);
        
        if (preciseCoefficient > 0) {
          financedAmount = calculateFinancedAmount(newTotalMonthlyPayment, preciseCoefficient);
        }
        
        console.log(`Commission Preview: Mensualité ${newTotalMonthlyPayment}€, Coefficient ${preciseCoefficient}, Montant financé ${financedAmount}€`);
        
        const levelIdToUse = commissionLevelId || "default";
        
        const commissionData = await calculateCommissionByLevel(
          financedAmount,
          levelIdToUse,
          'ambassador',
          ambassadorId || "default"
        );
        
        console.log("Commission calculation result:", commissionData);
        
        setCommission({
          amount: commissionData.amount || 0,
          rate: commissionData.rate || 0,
          levelName: commissionData.levelName || ""
        });
      } catch (error) {
        console.error("Error calculating commission:", error);
      } finally {
        setIsCalculating(false);
      }
    };
    
    const timer = setTimeout(calculateCommission, 300);
    
    return () => clearTimeout(timer);
  }, [ambassadorId, commissionLevelId, equipmentList.length, totalMonthlyPayment, canCalculateCommission, hasAttemptedCalculation]);

  if (!canCalculateCommission && !hasAttemptedCalculation) {
    return null;
  }

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="pb-2 border-b">
        <CardTitle>Votre commission</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between py-2">
          {isCalculating ? (
            <div className="flex items-center text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Calcul en cours...
            </div>
          ) : (
            <>
              <div className="font-medium">Montant de commission:</div>
              <div className="text-green-600 font-medium flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                <span className="commission-value">
                  {commission.amount > 0 ? formatCurrency(commission.amount) : "0,00 €"}
                </span>
                {commission.rate > 0 && (
                  <span className="text-sm text-muted-foreground">({commission.rate}%)</span>
                )}
              </div>
            </>
          )}
        </div>
        {commission.levelName && (
          <div className="mt-2 text-sm text-muted-foreground">
            Niveau de commission: {commission.levelName}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AmbassadorCommissionPreview;
