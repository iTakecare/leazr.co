
import React from "react";
import { formatCurrency, formatPercentage } from "@/utils/formatters";

interface PriceDetailsDisplayProps {
  marginAmount: number;
  priceWithMargin: number;
  coefficient: number;
  displayMonthlyPayment: number;
}

const PriceDetailsDisplay: React.FC<PriceDetailsDisplayProps> = ({
  marginAmount,
  priceWithMargin,
  coefficient,
  displayMonthlyPayment
}) => {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between py-1">
        <span className="text-gray-600">Marge en euros :</span>
        <span className="font-medium">{formatCurrency(marginAmount)}</span>
      </div>
      <div className="flex justify-between py-1">
        <span className="text-gray-600">Prix avec marge :</span>
        <span className="font-medium">{formatCurrency(priceWithMargin)}</span>
      </div>
      <div className="flex justify-between py-1">
        <span className="text-gray-600">Coefficient appliqué :</span>
        <span className="font-medium">{formatPercentage(coefficient)}</span>
      </div>
      <div className="flex justify-between py-1 text-blue-600">
        <span className="font-medium">Mensualité unitaire :</span>
        <span className="font-bold">{formatCurrency(displayMonthlyPayment)}</span>
      </div>
    </div>
  );
};

export default PriceDetailsDisplay;
