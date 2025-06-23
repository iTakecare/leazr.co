
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/utils/formatters";
import { CalculationResult } from "@/utils/equipmentCalculations";

interface FinancialSummaryProps {
  calculations: CalculationResult;
  useGlobalAdjustment: boolean;
  onToggleAdjustment: () => void;
}

const FinancialSummary = ({ 
  calculations, 
  useGlobalAdjustment, 
  onToggleAdjustment 
}: FinancialSummaryProps) => {
  const {
    totalPurchasePrice,
    totalFinancedAmount,
    normalMarginAmount,
    normalMarginPercentage,
    adjustedMarginAmount,
    adjustedMarginPercentage,
    globalCoefficient,
    marginDifference
  } = calculations;

  // Déterminer les valeurs à afficher selon le mode
  const displayedMarginAmount = useGlobalAdjustment ? adjustedMarginAmount : normalMarginAmount;
  const displayedMarginPercentage = useGlobalAdjustment ? adjustedMarginPercentage : normalMarginPercentage;

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="pb-2 border-b">
        <CardTitle>Récapitulatif financier</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-3">
          {/* Switch pour l'ajustement global */}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-blue-800">
                Ajuster la marge au coefficient appliqué
              </span>
              <span className="text-xs text-blue-600">
                Recalcule automatiquement la marge selon le coefficient global
              </span>
            </div>
            <Switch
              checked={useGlobalAdjustment}
              onCheckedChange={onToggleAdjustment}
            />
          </div>

          {/* Montant total d'achat */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              Montant total d'achat :
            </span>
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(totalPurchasePrice)}
            </span>
          </div>

          {/* Montant total financé */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              Montant total financé :
            </span>
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(totalFinancedAmount)}
            </span>
          </div>

          {/* Marge totale générée */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              Marge totale générée :
            </span>
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(displayedMarginAmount)} ({displayedMarginPercentage.toFixed(2)}%)
            </span>
          </div>

          {/* Coefficient appliqué */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              Coefficient appliqué :
            </span>
            <span className="text-sm font-semibold text-gray-900">
              {globalCoefficient.toFixed(2)}%
            </span>
          </div>

          {/* Ajustement du coefficient (si activé) */}
          {useGlobalAdjustment && (
            <div className="pt-2 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-orange-600">
                  Différence de marge (ajustement) :
                </span>
                <span className={`text-sm font-semibold ${marginDifference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {marginDifference > 0 ? '-' : '+'}{formatCurrency(Math.abs(marginDifference))}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Coefficient global appliqué sur le montant total financé
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FinancialSummary;
