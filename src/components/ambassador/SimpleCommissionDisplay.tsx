
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Calculator, Loader2 } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { getAmbassadorCommissionLevel, getCommissionRates } from "@/services/commissionService";
import { calculateFinancedAmount } from "@/utils/calculator";

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
  const [loading, setLoading] = useState(false);
  const [levelName, setLevelName] = useState("");

  useEffect(() => {
    const calculateCommission = async () => {
      if (totalMonthlyPayment <= 0 || equipmentListLength === 0) {
        setCommission(0);
        setCommissionRate(0);
        setLevelName("");
        return;
      }

      if (!ambassadorId) {
        // Si pas d'ambassadorId, utiliser un barème par défaut simple
        const financedAmount = calculateFinancedAmount(totalMonthlyPayment, 3.27);
        const defaultCommission = Math.round(financedAmount * 0.05); // 5% par défaut
        setCommission(defaultCommission);
        setCommissionRate(5);
        setLevelName("Commission par défaut");
        return;
      }

      setLoading(true);
      try {
        console.log("Calculating commission for ambassador:", ambassadorId);
        
        // Récupérer le niveau de commission de l'ambassadeur
        const commissionLevel = await getAmbassadorCommissionLevel(ambassadorId);
        
        if (!commissionLevel) {
          console.log("No commission level found, using default");
          const financedAmount = calculateFinancedAmount(totalMonthlyPayment, 3.27);
          const defaultCommission = Math.round(financedAmount * 0.05);
          setCommission(defaultCommission);
          setCommissionRate(5);
          setLevelName("Aucun barème attribué (défaut: 5%)");
          return;
        }

        console.log("Found commission level:", commissionLevel);
        setLevelName(commissionLevel.name);

        // Récupérer les taux de commission
        const rates = await getCommissionRates(commissionLevel.id);
        
        if (!rates || rates.length === 0) {
          console.log("No rates found for level, using default");
          const financedAmount = calculateFinancedAmount(totalMonthlyPayment, 3.27);
          const defaultCommission = Math.round(financedAmount * 0.05);
          setCommission(defaultCommission);
          setCommissionRate(5);
          return;
        }

        console.log("Found rates:", rates);

        // Calculer le montant financé
        const financedAmount = calculateFinancedAmount(totalMonthlyPayment, 3.27);
        console.log("Financed amount:", financedAmount);

        // Trouver le bon taux selon le montant financé
        const applicableRate = rates.find(rate => 
          financedAmount >= rate.min_amount && financedAmount <= rate.max_amount
        );

        if (applicableRate) {
          const commissionAmount = Math.round(financedAmount * (applicableRate.rate / 100));
          setCommission(commissionAmount);
          setCommissionRate(applicableRate.rate);
          console.log("Applied rate:", applicableRate.rate, "Commission:", commissionAmount);
        } else {
          // Si aucun taux ne correspond, prendre le taux le plus élevé
          const maxRate = rates.reduce((max, rate) => rate.rate > max.rate ? rate : max, rates[0]);
          const commissionAmount = Math.round(financedAmount * (maxRate.rate / 100));
          setCommission(commissionAmount);
          setCommissionRate(maxRate.rate);
          console.log("Used max rate:", maxRate.rate, "Commission:", commissionAmount);
        }

      } catch (error) {
        console.error("Error calculating commission:", error);
        // Fallback en cas d'erreur
        const financedAmount = calculateFinancedAmount(totalMonthlyPayment, 3.27);
        const fallbackCommission = Math.round(financedAmount * 0.05);
        setCommission(fallbackCommission);
        setCommissionRate(5);
        setLevelName("Erreur - Commission par défaut");
      } finally {
        setLoading(false);
      }
    };

    calculateCommission();
  }, [totalMonthlyPayment, ambassadorId, equipmentListLength]);

  // Toujours afficher le composant si on a une mensualité > 0
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
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-green-600" />
            <span className="ml-2 text-green-600">Calcul en cours...</span>
          </div>
        ) : (
          <div>
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
              {levelName && `Barème: ${levelName} • `}Commission calculée sur le montant financé
            </div>
            {!ambassadorId && (
              <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                ⚠️ Aucun ambassadeur associé - commission par défaut appliquée
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SimpleCommissionDisplay;
