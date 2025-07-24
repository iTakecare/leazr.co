
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/utils/formatters";
import { CalculationResult } from "@/utils/equipmentCalculations";

interface CommissionData {
  amount: number;
  rate: number;
  levelName: string;
}

interface OfferFinancialData {
  totalPurchasePrice: number;
  totalFinancedAmount: number;
  totalMargin: number;
  monthlyPayment: number;
  coefficient: number;
}

interface FinancialSummaryProps {
  calculations?: CalculationResult;
  useGlobalAdjustment: boolean;
  onToggleAdjustment: () => void;
  commissionData?: CommissionData;
  showCommission?: boolean;
  // New prop for using real offer data instead of calculations
  offerData?: OfferFinancialData;
}

const FinancialSummary = ({ 
  calculations, 
  useGlobalAdjustment, 
  onToggleAdjustment,
  commissionData,
  showCommission = false,
  offerData
}: FinancialSummaryProps) => {
  
  // If offerData is provided, use it instead of calculations
  if (offerData) {
    const {
      totalPurchasePrice,
      totalFinancedAmount,
      totalMargin,
      monthlyPayment,
      coefficient
    } = offerData;

    // Calculate margin percentage
    const marginPercentage = totalPurchasePrice > 0 ? (totalMargin / totalPurchasePrice) * 100 : 0;

    return (
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-2 border-b">
          <CardTitle>Récapitulatif financier</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
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
                {formatCurrency(totalMargin)} ({marginPercentage.toFixed(2)}%)
              </span>
            </div>

            {/* Mensualité totale */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                Mensualité totale :
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {formatCurrency(monthlyPayment)}
              </span>
            </div>

            {/* Coefficient appliqué */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                Coefficient appliqué :
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {coefficient.toFixed(3)}%
              </span>
            </div>

            {/* Commission (si affichée) */}
            {showCommission && commissionData && commissionData.amount > 0 && (
              <div className="pt-3 border-t border-gray-200">
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-green-800">
                      Commission ambassadeur :
                    </span>
                    <span className="text-lg font-bold text-green-900">
                      {formatCurrency(commissionData.amount)}
                    </span>
                  </div>
                  {commissionData.levelName && (
                    <div className="text-xs text-green-700">
                      Niveau : {commissionData.levelName} ({commissionData.rate.toFixed(2)}%)
                    </div>
                  )}
                </div>
                
                {/* Marge nette après commission */}
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-800">
                      Marge nette après commission :
                    </span>
                    <span className="text-lg font-bold text-blue-900">
                      {formatCurrency(totalMargin - commissionData.amount)} ({((totalMargin - commissionData.amount) / totalPurchasePrice * 100).toFixed(2)}%)
                    </span>
                  </div>
                  <div className="text-xs text-blue-700 mt-1">
                    Marge réelle conservée par l'entreprise
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fallback to original calculations if no offerData provided
  if (!calculations) {
    return null;
  }

  const {
    totalPurchasePrice,
    totalFinancedAmount,
    normalMarginAmount,
    normalMarginPercentage,
    normalMonthlyPayment,
    adjustedMarginAmount,
    adjustedMarginPercentage,
    adjustedMonthlyPayment,
    globalCoefficient,
    marginDifference
  } = calculations;

  // Déterminer les valeurs à afficher selon le mode
  const displayedMarginAmount = useGlobalAdjustment ? adjustedMarginAmount : normalMarginAmount;
  const displayedMarginPercentage = useGlobalAdjustment ? adjustedMarginPercentage : normalMarginPercentage;
  const displayedMonthlyPayment = useGlobalAdjustment ? adjustedMonthlyPayment : normalMonthlyPayment;

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

          {/* Mensualité totale */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              Mensualité totale :
            </span>
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(displayedMonthlyPayment)}
            </span>
          </div>

          {/* Coefficient appliqué */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              Coefficient appliqué :
            </span>
            <span className="text-sm font-semibold text-gray-900">
              {globalCoefficient.toFixed(3)}%
            </span>
          </div>

          {/* Ajustement du coefficient (si activé) */}
          {useGlobalAdjustment && (
            <div className="pt-2 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-orange-600">
                  Impact sur la marge :
                </span>
                <span className={`text-sm font-semibold ${marginDifference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {marginDifference > 0 ? '-' : '+'}{formatCurrency(Math.abs(marginDifference))}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {marginDifference > 0 ? 'Perte de marge' : 'Gain de marge'} avec le coefficient global
              </div>
            </div>
          )}

          {/* Commission (si affichée) */}
          {showCommission && commissionData && commissionData.amount > 0 && (
            <div className="pt-3 border-t border-gray-200">
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-green-800">
                    Commission ambassadeur :
                  </span>
                  <span className="text-lg font-bold text-green-900">
                    {formatCurrency(commissionData.amount)}
                  </span>
                </div>
                {commissionData.levelName && (
                  <div className="text-xs text-green-700">
                    Niveau : {commissionData.levelName} ({commissionData.rate.toFixed(2)}%)
                  </div>
                )}
              </div>
              
              {/* Marge nette après commission */}
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-800">
                    Marge nette après commission :
                  </span>
                  <span className="text-lg font-bold text-blue-900">
                    {formatCurrency(displayedMarginAmount - commissionData.amount)} ({((displayedMarginAmount - commissionData.amount) / totalPurchasePrice * 100).toFixed(2)}%)
                  </span>
                </div>
                <div className="text-xs text-blue-700 mt-1">
                  Marge réelle conservée par l'entreprise
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FinancialSummary;
