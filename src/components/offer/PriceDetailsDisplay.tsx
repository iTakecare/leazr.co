
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
  // Vérifier si la mensualité calculée correspond exactement à la formule PrixAvecMarge * Coefficient / 100
  const calculatedMonthly = (priceWithMargin * coefficient) / 100;
  const isMatchingFormula = Math.abs(calculatedMonthly - displayMonthlyPayment) < 0.01;

  // Calculer la marge ajustée en fonction de la mensualité affichée
  const adjustedMarginAmount = ((displayMonthlyPayment * 100) / coefficient) - (priceWithMargin - marginAmount);
  const adjustedMarginPercentage = (adjustedMarginAmount / (priceWithMargin - marginAmount)) * 100;

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
      
      {!isMatchingFormula && calculatedMonthly > 0 && (
        <>
          <div className="flex justify-between py-1 text-amber-600 text-xs">
            <span>Mensualité calculée avec le coefficient :</span>
            <span>{formatCurrency(calculatedMonthly)}</span>
          </div>
          
          <div className="flex justify-between py-1 text-green-600 text-xs">
            <span>Marge ajustée en euros :</span>
            <span>{formatCurrency(adjustedMarginAmount)}</span>
          </div>
          
          <div className="flex justify-between py-1 text-green-600 text-xs">
            <span>Marge ajustée en pourcentage :</span>
            <span>{formatPercentage(adjustedMarginPercentage)}</span>
          </div>
        </>
      )}
    </div>
  );
};

export default PriceDetailsDisplay;
