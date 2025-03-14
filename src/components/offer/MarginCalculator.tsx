
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPercentage } from "@/utils/formatters";
import { Calculator } from "lucide-react";

interface MarginCalculatorProps {
  targetMonthlyPayment: number;
  setTargetMonthlyPayment: (value: number) => void;
  calculatedMargin: { percentage: number; amount: number };
  applyCalculatedMargin: () => void;
}

const MarginCalculator: React.FC<MarginCalculatorProps> = ({
  targetMonthlyPayment,
  setTargetMonthlyPayment,
  calculatedMargin,
  applyCalculatedMargin
}) => {
  const [inputValue, setInputValue] = useState(targetMonthlyPayment.toString());

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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center">
          <Calculator className="h-4 w-4 mr-2 text-primary" />
          Calculateur de marge inversé
        </CardTitle>
        <CardDescription className="text-xs">
          Calculez la marge à appliquer pour atteindre une mensualité cible
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Input
                type="number"
                min="0"
                step="1"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="w-full"
                placeholder="Mensualité souhaitée"
              />
            </div>
            <Button 
              onClick={applyCalculatedMargin}
              disabled={calculatedMargin.percentage <= 0}
              variant="secondary"
              className="w-full"
            >
              Appliquer
            </Button>
          </div>

          <div className="bg-muted/50 p-3 rounded text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-muted-foreground">Marge calculée:</span>
              <span className="font-medium">
                {formatPercentage(calculatedMargin.percentage)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Montant de la marge:</span>
              <span className="font-medium">
                {formatCurrency(calculatedMargin.amount)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MarginCalculator;
