
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Loader2 } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { useCommissionCalculator } from "@/hooks/useCommissionCalculator";

interface CommissionDisplayProps {
  totalMonthlyPayment: number;
  ambassadorId?: string;
  commissionLevelId?: string;
  equipmentListLength: number;
}

const CommissionDisplay = ({
  totalMonthlyPayment,
  ambassadorId,
  commissionLevelId,
  equipmentListLength
}: CommissionDisplayProps) => {
  const commission = useCommissionCalculator(
    totalMonthlyPayment,
    ambassadorId,
    commissionLevelId,
    equipmentListLength
  );

  if (totalMonthlyPayment <= 0 || equipmentListLength === 0) {
    return null;
  }

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="pb-2 border-b">
        <CardTitle>Votre commission</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between py-2">
          {commission.isCalculating ? (
            <div className="flex items-center text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Calcul en cours...
            </div>
          ) : (
            <>
              <div className="font-medium">Montant de commission:</div>
              <div className="text-green-600 font-medium flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                <span 
                  className="commission-value"
                  data-commission-amount={commission.amount}
                  id="commission-display-value"
                >
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

export default CommissionDisplay;
