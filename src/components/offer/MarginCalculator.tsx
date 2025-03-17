
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPercentage } from "@/utils/formatters";
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
}

const MarginCalculator: React.FC<MarginCalculatorProps> = ({
  targetMonthlyPayment,
  setTargetMonthlyPayment,
  calculatedMargin,
  applyCalculatedMargin,
  selectedLeaser,
  coefficient
}) => {
  const [inputValue, setInputValue] = useState(targetMonthlyPayment ? targetMonthlyPayment.toString() : "");

  // Mettre à jour le champ d'entrée quand targetMonthlyPayment change
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
    // D'abord définir explicitement la mensualité cible pour garantir sa mise à jour
    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue) && numValue > 0) {
      setTargetMonthlyPayment(numValue);
      
      // Attendre le prochain cycle de rendu avant d'appliquer la marge calculée
      setTimeout(() => {
        applyCalculatedMargin();
      }, 0);
    } else {
      applyCalculatedMargin();
    }
  };

  return (
    <Card className="shadow-sm border-gray-200 rounded-lg">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg font-medium">Calcul de la marge à partir de la mensualité souhaitée</CardTitle>
        {/* Le sélecteur de prestataire est maintenant masqué */}
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

          {/* Les informations de marge et coefficient sont maintenant masquées */}

          <Button 
            onClick={handleApplyMargin}
            disabled={calculatedMargin.percentage <= 0}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Appliquer cette marge
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MarginCalculator;
