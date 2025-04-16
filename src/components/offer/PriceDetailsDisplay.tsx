
import React from "react";
import { formatCurrency } from "@/utils/formatters";

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
  hideFinancialDetails = false,
  calculatedMargin
}) => {
  if (hideFinancialDetails) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <div className="flex justify-between items-center">
          <span className="text-gray-700 font-medium">Mensualité:</span>
          <span className="text-gray-900 font-bold">
            {formatCurrency(displayMonthlyPayment)}
          </span>
        </div>
      </div>
    );
  }
  
  // Utilisez la marge calculée si disponible, sinon utilisez la marge fournie
  const displayMarginAmount = calculatedMargin ? calculatedMargin.amount : marginAmount;
  const displayPercentage = calculatedMargin ? calculatedMargin.percentage : (marginAmount / priceWithMargin) * 100;

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Marge:</span>
          <span className="text-gray-900">
            {formatCurrency(displayMarginAmount)} ({displayPercentage.toFixed(2)}%)
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Montant financé:</span>
          <span className="text-gray-900">{formatCurrency(priceWithMargin)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Coefficient:</span>
          <span className="text-gray-900">{coefficient.toFixed(3)}</span>
        </div>
        <div className="flex justify-between items-center border-t pt-2 mt-2">
          <span className="text-gray-700 font-medium">Mensualité:</span>
          <span className="text-gray-900 font-bold">
            {formatCurrency(displayMonthlyPayment)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PriceDetailsDisplay;
