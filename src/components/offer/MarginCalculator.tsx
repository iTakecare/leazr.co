
import React from "react";
import { Euro } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/utils/formatters";

interface MarginCalculatorProps {
  targetMonthlyPayment: number;
  setTargetMonthlyPayment: React.Dispatch<React.SetStateAction<number>>;
  calculatedMargin: { percentage: number; amount: number };
  applyCalculatedMargin: () => void;
}

const MarginCalculator: React.FC<MarginCalculatorProps> = ({
  targetMonthlyPayment,
  setTargetMonthlyPayment,
  calculatedMargin,
  applyCalculatedMargin,
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseFloat(e.target.value) : 0;
    setTargetMonthlyPayment(Math.max(0, value));
  };
  
  return (
    <div>
      <h2 className="text-lg font-semibold mb-6">Calcul de la marge à partir de la mensualité souhaitée</h2>
      <div className="grid gap-6">
        <div>
          <Label className="text-sm font-medium text-gray-700">
            Mensualité souhaitée (€)
          </Label>
          <div className="relative">
            <Euro className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="number"
              min="0"
              step="0.01"
              className="pl-10"
              value={targetMonthlyPayment || ''}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-6">
          <div className="grid gap-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Marge nécessaire :</span>
              <span className="font-semibold">{calculatedMargin.percentage.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between items-center text-lg font-bold text-blue-600">
              <span>Marge en euros :</span>
              <span>{formatCurrency(calculatedMargin.amount)}</span>
            </div>
            <Button
              onClick={applyCalculatedMargin}
              disabled={calculatedMargin.percentage === 0}
              className="w-full mt-2"
            >
              Appliquer cette marge
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarginCalculator;
