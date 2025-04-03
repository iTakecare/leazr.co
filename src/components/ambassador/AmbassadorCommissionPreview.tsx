
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Loader2 } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { calculateCommissionByLevel } from "@/utils/calculator";
import { toast } from "sonner";

interface AmbassadorCommissionPreviewProps {
  totalMonthlyPayment: number;
  ambassadorId?: string;
  commissionLevelId?: string;
  equipmentList: any[];
  onCommissionCalculated?: (commission: number) => void;
}

const AmbassadorCommissionPreview = ({
  totalMonthlyPayment,
  ambassadorId,
  commissionLevelId,
  equipmentList,
  onCommissionCalculated
}: AmbassadorCommissionPreviewProps) => {
  const [commission, setCommission] = useState<{ amount: number; rate: number; levelName: string }>({
    amount: 0,
    rate: 0,
    levelName: ""
  });
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    const calculateCommission = async () => {
      if (!totalMonthlyPayment || totalMonthlyPayment === 0 || !ambassadorId || !commissionLevelId) {
        return;
      }

      setIsCalculating(true);
      try {
        console.log(`Calculating commission for ambassador ${ambassadorId} with level ${commissionLevelId}`);
        const totalEquipmentAmount = equipmentList.reduce((sum, eq) => sum + (eq.purchasePrice * eq.quantity), 0);
        const commissionData = await calculateCommissionByLevel(
          totalEquipmentAmount,
          commissionLevelId,
          'ambassador',
          ambassadorId
        );
        
        setCommission({
          amount: commissionData.amount,
          rate: commissionData.rate,
          levelName: commissionData.levelName || ""
        });
        
        // Notify parent component about the calculated commission
        if (onCommissionCalculated) {
          onCommissionCalculated(commissionData.amount);
        }
        
        console.log("Commission calculated:", commissionData);
      } catch (error) {
        console.error("Error calculating commission:", error);
        toast.error("Erreur lors du calcul de la commission");
      } finally {
        setIsCalculating(false);
      }
    };

    if (equipmentList.length > 0 && (ambassadorId || commissionLevelId)) {
      calculateCommission();
    }
  }, [totalMonthlyPayment, equipmentList, ambassadorId, commissionLevelId, onCommissionCalculated]);

  if (!ambassadorId || !commissionLevelId) {
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
                {formatCurrency(commission.amount)}
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
