import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, Euro, Calculator } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";

interface DownPaymentCardProps {
  downPayment: number;
  onDownPaymentChange: (value: number) => void;
  totalSellingPrice: number;
  coefficient: number;
  disabled?: boolean;
}

const DownPaymentCard: React.FC<DownPaymentCardProps> = ({
  downPayment,
  onDownPaymentChange,
  totalSellingPrice,
  coefficient,
  disabled = false
}) => {
  const [inputValue, setInputValue] = useState(downPayment.toString());

  // Sync input with prop
  useEffect(() => {
    setInputValue(downPayment.toString());
  }, [downPayment]);

  // Calculate effective amounts
  const effectiveFinancedAmount = Math.max(0, totalSellingPrice - downPayment);
  const adjustedMonthlyPayment = coefficient > 0 
    ? (effectiveFinancedAmount * coefficient) / 100 
    : 0;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow comma as decimal separator
    setInputValue(value);
    
    // Parse with comma support
    const normalizedValue = value.replace(',', '.');
    const numValue = parseFloat(normalizedValue) || 0;
    // Ensure down payment doesn't exceed total
    const clampedValue = Math.min(numValue, totalSellingPrice);
    onDownPaymentChange(Math.max(0, clampedValue));
  };

  const handleBlur = () => {
    // Ensure we have a valid value on blur
    const normalizedValue = inputValue.replace(',', '.');
    const numValue = parseFloat(normalizedValue) || 0;
    const clampedValue = Math.min(Math.max(0, numValue), totalSellingPrice);
    // Format with comma for display
    setInputValue(clampedValue.toString().replace('.', ','));
    onDownPaymentChange(clampedValue);
  };

  const hasDownPayment = downPayment > 0;

  return (
    <Card className={`border ${hasDownPayment ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200'} shadow-sm`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
          <Wallet className={`w-5 h-5 ${hasDownPayment ? 'text-amber-600' : 'text-gray-500'}`} />
          Acompte
          {hasDownPayment && (
            <span className="ml-auto text-xs font-normal bg-amber-200 text-amber-800 px-2 py-0.5 rounded">
              Actif
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 space-y-4">
        {/* Input acompte */}
        <div className="space-y-2">
          <Label htmlFor="down-payment" className="text-sm text-gray-600">
            Montant de l'acompte (€)
          </Label>
          <div className="relative">
            <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="down-payment"
              type="text"
              inputMode="decimal"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder="0"
              disabled={disabled}
              className="pl-9"
            />
          </div>
          <p className="text-xs text-gray-500">
            Maximum : {formatCurrency(totalSellingPrice)}
          </p>
        </div>

        {/* Résumé si acompte actif */}
        {hasDownPayment && (
          <div className="pt-3 border-t border-amber-200 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Montant initial :</span>
              <span className="font-medium text-gray-900">{formatCurrency(totalSellingPrice)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-amber-700">- Acompte :</span>
              <span className="font-medium text-amber-700">- {formatCurrency(downPayment)}</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-2 border-t border-amber-200">
              <span className="font-medium text-gray-700 flex items-center gap-1">
                <Euro className="h-3.5 w-3.5" />
                Montant financé :
              </span>
              <span className="font-bold text-gray-900">{formatCurrency(effectiveFinancedAmount)}</span>
            </div>
            {coefficient > 0 && (
              <div className="flex justify-between items-center text-sm bg-green-50 rounded-lg p-2 border border-green-200">
                <span className="font-medium text-green-700 flex items-center gap-1">
                  <Calculator className="h-3.5 w-3.5" />
                  Nouvelle mensualité :
                </span>
                <span className="font-bold text-green-800">{formatCurrency(adjustedMonthlyPayment)}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DownPaymentCard;
