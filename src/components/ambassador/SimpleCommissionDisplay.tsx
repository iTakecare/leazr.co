
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Calculator } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";

interface SimpleCommissionDisplayProps {
  totalMonthlyPayment: number;
  ambassadorId?: string;
  equipmentListLength: number;
}

const SimpleCommissionDisplay = ({
  totalMonthlyPayment,
  ambassadorId,
  equipmentListLength
}: SimpleCommissionDisplayProps) => {
  const [commission, setCommission] = useState(0);
  const [commissionRate, setCommissionRate] = useState(0);

  useEffect(() => {
    if (totalMonthlyPayment > 0 && equipmentListLength > 0) {
      // Calcul simple du montant financé (mensualité * coefficient moyen de 3.27)
      const financedAmount = totalMonthlyPayment * 36.72; // 12 mois * coefficient 3.27 / coefficient
      
      // Barème de commission simplifié
      let rate = 5; // Taux par défaut 5%
      
      if (financedAmount <= 2500) {
        rate = 10;
      } else if (financedAmount <= 5000) {
        rate = 13;
      } else if (financedAmount <= 12500) {
        rate = 18;
      } else if (financedAmount <= 25000) {
        rate = 21;
      } else {
        rate = 25;
      }
      
      const commissionAmount = Math.round(financedAmount * (rate / 100));
      
      setCommission(commissionAmount);
      setCommissionRate(rate);
      
      console.log("Commission calculée:", {
        totalMonthlyPayment,
        financedAmount,
        rate,
        commissionAmount
      });
    } else {
      setCommission(0);
      setCommissionRate(0);
    }
  }, [totalMonthlyPayment, equipmentListLength]);

  if (totalMonthlyPayment <= 0 || equipmentListLength === 0) {
    return null;
  }

  return (
    <Card className="border border-green-200 bg-green-50 shadow-sm">
      <CardHeader className="pb-2 border-b border-green-200">
        <CardTitle className="flex items-center gap-2 text-green-800">
          <Calculator className="h-4 w-4" />
          Votre commission d'ambassadeur
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between py-2">
          <div className="font-medium text-green-700">Commission estimée:</div>
          <div className="text-green-600 font-bold flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            <span 
              className="commission-value text-lg"
              data-commission-amount={commission}
              id="ambassador-commission-value"
            >
              {formatCurrency(commission)}
            </span>
            <span className="text-sm text-green-500">({commissionRate}%)</span>
          </div>
        </div>
        <div className="mt-2 text-xs text-green-600">
          Commission calculée sur le montant total financé
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleCommissionDisplay;
