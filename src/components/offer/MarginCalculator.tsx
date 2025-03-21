
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaser } from "@/types/equipment";

interface MarginCalculatorProps {
  targetMonthlyPayment: number;
  setTargetMonthlyPayment: (value: number) => void;
  calculatedMargin: { percentage: number; amount: number };
  applyCalculatedMargin: () => void;
  selectedLeaser: Leaser | null;
  coefficient: number;
  hideFinancialDetails?: boolean;
}

const MarginCalculator: React.FC<MarginCalculatorProps> = ({
  targetMonthlyPayment,
  setTargetMonthlyPayment,
  calculatedMargin,
  applyCalculatedMargin,
  selectedLeaser,
  coefficient,
  hideFinancialDetails = false
}) => {
  const [inputValue, setInputValue] = useState(targetMonthlyPayment ? targetMonthlyPayment.toString() : "");

  // Update input field when targetMonthlyPayment changes
  useEffect(() => {
    if (targetMonthlyPayment > 0) {
      setInputValue(targetMonthlyPayment.toString());
    }
  }, [targetMonthlyPayment]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleBlur = () => {
    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue) && numValue >= 0) {
      setTargetMonthlyPayment(numValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
  };

  const handleApplyMargin = () => {
    // First explicitly set the target monthly payment to ensure it's updated
    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue) && numValue > 0) {
      setTargetMonthlyPayment(numValue);
      
      // Wait for the next render cycle before applying the calculated margin
      setTimeout(() => {
        applyCalculatedMargin();
      }, 0);
    } else {
      applyCalculatedMargin();
    }
  };

  // Format percentage with comma as decimal separator
  const formatPercentageWithComma = (value: number): string => {
    return value.toFixed(2).replace('.', ',') + ' %';
  };

  return (
    <Card className="shadow-sm border-gray-200 rounded-lg">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg font-medium">Calcul de la marge à partir de la mensualité souhaitée</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-5">
          <div>
            <Label htmlFor="target-monthly" className="font-medium text-gray-700">Mensualité souhaitée (€)</Label>
            <div className="mt-1 relative">
              <Input
                id="target-monthly"
                type="number"
                min="0"
                step="0.01"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="pl-8"
                placeholder="0.00"
              />
              <span className="absolute left-3 top-3 text-gray-500 pointer-events-none">€</span>
            </div>
          </div>

          {!hideFinancialDetails && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-sm text-gray-700">Coefficient appliqué :</span>
                <span className="font-medium">{coefficient.toFixed(3)}</span>
              </div>
              <div>
                <span className="block text-sm text-gray-700">Marge calculée :</span>
                <span className="font-medium">
                  {calculatedMargin.percentage > 0 ? formatPercentageWithComma(calculatedMargin.percentage) : '-'}
                </span>
              </div>
              <div>
                <span className="block text-sm text-gray-700">Marge (€) :</span>
                <span className="font-medium">
                  {calculatedMargin.amount > 0 ? formatCurrency(calculatedMargin.amount) : '-'}
                </span>
              </div>
            </div>
          )}

          <Button 
            onClick={handleApplyMargin}
            disabled={!hideFinancialDetails && calculatedMargin.percentage <= 0}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {hideFinancialDetails ? 'Appliquer cette mensualité' : 'Appliquer cette marge'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MarginCalculator;
