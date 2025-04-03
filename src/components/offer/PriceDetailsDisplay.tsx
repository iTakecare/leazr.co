
import React from "react";
import { formatCurrency, formatPercentageWithComma } from "@/utils/formatters";
import { useAuth } from "@/context/AuthContext";

interface PriceDetailsDisplayProps {
  marginAmount: number;
  priceWithMargin: number;
  coefficient: number;
  displayMonthlyPayment: number;
  hideFinancialDetails?: boolean;
  calculatedMargin?: { percentage: number; amount: number };
}

const PriceDetailsDisplay: React.FC<PriceDetailsDisplayProps> = ({
  marginAmount,
  priceWithMargin,
  coefficient,
  displayMonthlyPayment,
  hideFinancialDetails = true,
  calculatedMargin
}) => {
  const { isAdmin } = useAuth();
  
  // Calculate the price without margin (base price)
  const priceWithoutMargin = priceWithMargin - marginAmount;
  
  // Use calculated margin if available, otherwise calculate it
  const marginPercentage = calculatedMargin?.percentage || (priceWithoutMargin > 0 
    ? (marginAmount / priceWithoutMargin) * 100 
    : 0);
  
  // Use calculated margin amount if available
  const displayMarginAmount = calculatedMargin?.amount || marginAmount;
  
  // Calculate the actual price with margin based on the calculated amount
  const displayPriceWithMargin = priceWithoutMargin + displayMarginAmount;

  // Only show financial details to admins
  const shouldShowFinancialDetails = isAdmin() && !hideFinancialDetails;

  return (
    <div className="space-y-2 border-t pt-4 mt-4">
      {shouldShowFinancialDetails && (
        <>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Marge :</span>
            <span className="font-medium">
              {formatCurrency(displayMarginAmount)} ({isNaN(marginPercentage) ? "NaN" : formatPercentageWithComma(marginPercentage)})
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Prix avec marge :</span>
            <span className="font-medium">{formatCurrency(displayPriceWithMargin)}</span>
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
