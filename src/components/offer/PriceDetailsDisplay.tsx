
import React from "react";
import { formatCurrency } from "@/utils/formatters";

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
  // Calculate the price without margin (base price)
  const priceWithoutMargin = priceWithMargin - marginAmount;
  
  // Calculate the margin percentage based on the price without margin
  const marginPercentage = priceWithoutMargin > 0 
    ? (marginAmount / priceWithoutMargin) * 100 
    : 0;
    
  // Fonction pour formater correctement le pourcentage avec la virgule comme séparateur décimal
  const formatPercentageWithComma = (value: number): string => {
    return value.toFixed(2).replace('.', ',') + '%';
  };

  return (
    <div className="space-y-2 border-t pt-4 mt-4">
      {!hideFinancialDetails && (
        <>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Marge :</span>
            <span className="font-medium">
              {formatCurrency(marginAmount)} ({isNaN(marginAmount) ? "NaN" : (marginPercentage > 0 ? formatPercentageWithComma(marginPercentage) : "0,00%")})
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Prix avec marge :</span>
            <span className="font-medium">{formatCurrency(priceWithMargin)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Coefficient appliqué :</span>
            <span className="font-medium">{coefficient.toFixed(3)}</span>
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
