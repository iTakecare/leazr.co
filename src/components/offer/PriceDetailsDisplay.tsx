
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

  // Utiliser la marge ajustée si elle est disponible, sinon utiliser la marge standard
  const displayMarginAmount = !isMatchingFormula ? adjustedMarginAmount : marginAmount;
  const displayMarginPercentage = !isMatchingFormula ? adjustedMarginPercentage : (marginAmount / (priceWithMargin - marginAmount)) * 100;

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between py-1">
        <span>Marge :</span>
        <span>{formatCurrency(displayMarginAmount)} ({formatPercentage(displayMarginPercentage)})</span>
      </div>
      
      <div className="flex justify-between py-1">
        <span>Prix avec marge :</span>
        <span>{formatCurrency(priceWithMargin)}</span>
      </div>
      
      <div className="flex justify-between py-1">
        <span>Coefficient appliqué :</span>
        <span>{coefficient.toFixed(2)}</span>
      </div>
      
      <div className="flex justify-between py-1 text-blue-600">
        <span className="font-medium">Mensualité unitaire :</span>
        <span className="font-bold">{formatCurrency(displayMonthlyPayment)}</span>
      </div>
      
      {!isMatchingFormula && calculatedMonthly > 0 && (
        <div className="flex justify-between py-1 text-amber-600 text-xs">
          <span>Mensualité calculée avec le coefficient :</span>
          <span>{formatCurrency(calculatedMonthly)}</span>
        </div>
      )}
    </div>
  );
};

export default PriceDetailsDisplay;
