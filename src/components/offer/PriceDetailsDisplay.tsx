
import React from "react";
import { formatCurrency, formatPercentage } from "@/utils/formatters";

interface PriceDetailsDisplayProps {
  marginAmount: number;
  priceWithMargin: number;
  coefficient: number;
  displayMonthlyPayment: number;
  hideFinancialDetails?: boolean;
}

const PriceDetailsDisplay: React.FC<PriceDetailsDisplayProps> = ({
  marginAmount,
  priceWithMargin,
  coefficient,
  displayMonthlyPayment,
  hideFinancialDetails = false
}) => {
  // Formatter le coefficient comme un nombre décimal (pas un pourcentage)
  const formatCoefficient = (value: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3
    }).format(value);
  };

  return (
    <div className="space-y-2 border-t pt-4 mt-4">
      {!hideFinancialDetails && (
        <>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Marge :</span>
            <span className="font-medium">
              {formatCurrency(marginAmount)} ({isNaN(marginAmount) ? "NaN" : (marginAmount > 0 ? ((marginAmount / (priceWithMargin - marginAmount)) * 100).toFixed(2) : 0)}%)
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Prix avec marge :</span>
            <span className="font-medium">{formatCurrency(priceWithMargin)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Coefficient appliqué :</span>
            <span className="font-medium">{formatCoefficient(coefficient)}</span>
          </div>
        </>
      )}
      <div className="flex justify-between items-center border-t pt-2 mt-2">
        <span className="text-blue-600 font-medium">Mensualité unitaire :</span>
        <span className="text-blue-600 font-medium text-lg">{formatCurrency(displayMonthlyPayment)}</span>
      </div>
    </div>
  );
};

export default PriceDetailsDisplay;
