
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatters";
import { useCommissionCalculator } from "@/hooks/useCommissionCalculator";

interface AmbassadorFinancialSummaryProps {
  totalMonthlyPayment: number;
  ambassadorId?: string;
  commissionLevelId?: string;
  equipmentListLength: number;
  totalMargin?: number;
}

const AmbassadorFinancialSummary = ({
  totalMonthlyPayment,
  ambassadorId,
  commissionLevelId,
  equipmentListLength,
  totalMargin
}: AmbassadorFinancialSummaryProps) => {
  console.log("AmbassadorFinancialSummary - Props received:", {
    totalMonthlyPayment,
    ambassadorId,
    commissionLevelId,
    equipmentListLength,
    totalMargin
  });

  const commission = useCommissionCalculator(
    totalMonthlyPayment,
    ambassadorId,
    commissionLevelId,
    equipmentListLength,
    totalMargin
  );

  console.log("AmbassadorFinancialSummary - Commission calculated:", commission);

  if (totalMonthlyPayment <= 0 || equipmentListLength === 0) {
    console.log("AmbassadorFinancialSummary - Not showing: insufficient data");
    return null;
  }

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="pb-2 border-b">
        <CardTitle>Récapitulatif financier</CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="flex justify-between items-center py-2 border-b">
          <div className="font-medium text-gray-700">Mensualité totale:</div>
          <div className="text-lg font-bold text-gray-900">
            {formatCurrency(totalMonthlyPayment)}
          </div>
        </div>
        
        <div className="flex justify-between items-center py-2">
          <div className="font-medium text-gray-700">Votre commission:</div>
          <div className="text-green-600 font-bold">
            <span>
              {commission.amount > 0 ? formatCurrency(commission.amount) : "0,00 €"}
            </span>
          </div>
        </div>
        
        {commission.levelName && (
          <div className="text-sm text-muted-foreground pt-2 border-t">
            Niveau de commission: {commission.levelName}
          </div>
        )}
        
        {commission.isCalculating && (
          <div className="text-sm text-blue-600 pt-2 border-t">
            Calcul en cours...
          </div>
        )}
        
        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-500 pt-2 border-t bg-gray-50 p-2 rounded">
            Debug: ambassadorId={ambassadorId}, commissionLevelId={commissionLevelId}, 
            totalMonthly={totalMonthlyPayment}, equipCount={equipmentListLength}, totalMargin={totalMargin}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AmbassadorFinancialSummary;
