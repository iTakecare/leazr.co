
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Leaser } from "@/types/equipment";

interface MarginCalculatorProps {
  targetMonthlyPayment: number;
  setTargetMonthlyPayment: (value: number) => void;
  calculatedMargin: { percentage: number; amount: number };
  applyCalculatedMargin: () => void;
  selectedLeaser: Leaser | null;
  coefficient: number;
  hideFinancialDetails?: boolean;
  equipmentPurchasePrice: number;
  targetSalePrice: number;
  setTargetSalePrice: (value: number) => void;
  calculatedFromSalePrice: { margin: number; monthlyPayment: number };
  applyCalculatedFromSalePrice: () => void;
}

const MarginCalculator: React.FC<MarginCalculatorProps> = ({
  targetMonthlyPayment,
  setTargetMonthlyPayment,
  calculatedMargin,
  applyCalculatedMargin,
  selectedLeaser,
  coefficient,
  hideFinancialDetails = false,
  equipmentPurchasePrice,
  targetSalePrice,
  setTargetSalePrice,
  calculatedFromSalePrice,
  applyCalculatedFromSalePrice
}) => {
  const [inputValue, setInputValue] = useState(targetMonthlyPayment ? targetMonthlyPayment.toString() : "");
  const [salePriceInput, setSalePriceInput] = useState(targetSalePrice ? targetSalePrice.toString() : "");
  const [activeTab, setActiveTab] = useState("monthly");

  // Update input field when targetMonthlyPayment changes
  useEffect(() => {
    if (targetMonthlyPayment > 0) {
      setInputValue(targetMonthlyPayment.toString());
    }
  }, [targetMonthlyPayment]);

  // Update sale price input when targetSalePrice changes
  useEffect(() => {
    if (targetSalePrice > 0) {
      setSalePriceInput(targetSalePrice.toString());
    }
  }, [targetSalePrice]);

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

  const handleSalePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSalePriceInput(e.target.value);
  };

  const handleSalePriceBlur = () => {
    const numValue = parseFloat(salePriceInput);
    if (!isNaN(numValue) && numValue >= 0) {
      setTargetSalePrice(numValue);
    }
  };

  const handleSalePriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSalePriceBlur();
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

  const handleApplySalePrice = () => {
    // First explicitly set the target sale price to ensure it's updated
    const numValue = parseFloat(salePriceInput);
    if (!isNaN(numValue) && numValue > 0) {
      setTargetSalePrice(numValue);
      
      // Wait for the next render cycle before applying the calculated values
      setTimeout(() => {
        applyCalculatedFromSalePrice();
      }, 0);
    } else {
      applyCalculatedFromSalePrice();
    }
  };

  // Format percentage with comma as decimal separator
  const formatPercentageWithComma = (value: number): string => {
    return value.toFixed(2).replace('.', ',') + ' %';
  };

  const cardTitle = hideFinancialDetails 
    ? "Calculateur de prix" 
    : "Calcul de la marge et mensualité";

  return (
    <Card className="shadow-sm border-gray-200 rounded-lg">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg font-medium">{cardTitle}</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="monthly">Par mensualité</TabsTrigger>
            <TabsTrigger value="saleprice">Par prix de vente</TabsTrigger>
          </TabsList>
          
          <TabsContent value="monthly" className="space-y-5 mt-4">
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
              disabled={false}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {hideFinancialDetails ? 'Appliquer cette mensualité' : 'Appliquer cette marge'}
            </Button>
          </TabsContent>

          <TabsContent value="saleprice" className="space-y-5 mt-4">
            <div>
              <Label htmlFor="target-saleprice" className="font-medium text-gray-700">Prix de vente souhaité (€)</Label>
              <div className="mt-1 relative">
                <Input
                  id="target-saleprice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={salePriceInput}
                  onChange={handleSalePriceChange}
                  onBlur={handleSalePriceBlur}
                  onKeyDown={handleSalePriceKeyDown}
                  className="pl-8"
                  placeholder="0.00"
                />
                <span className="absolute left-3 top-3 text-gray-500 pointer-events-none">€</span>
              </div>
              {targetSalePrice > 0 && targetSalePrice <= equipmentPurchasePrice && (
                <p className="text-sm text-red-600 mt-1">
                  Le prix de vente doit être supérieur au prix d'achat ({formatCurrency(equipmentPurchasePrice)})
                </p>
              )}
            </div>

            {!hideFinancialDetails && targetSalePrice > equipmentPurchasePrice && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-sm text-gray-700">Prix d'achat :</span>
                  <span className="font-medium">{formatCurrency(equipmentPurchasePrice)}</span>
                </div>
                <div>
                  <span className="block text-sm text-gray-700">Marge calculée :</span>
                  <span className="font-medium">
                    {calculatedFromSalePrice.margin > 0 ? formatPercentageWithComma(calculatedFromSalePrice.margin) : '-'}
                  </span>
                </div>
                <div>
                  <span className="block text-sm text-gray-700">Marge (€) :</span>
                  <span className="font-medium">
                    {targetSalePrice > equipmentPurchasePrice ? formatCurrency(targetSalePrice - equipmentPurchasePrice) : '-'}
                  </span>
                </div>
                <div>
                  <span className="block text-sm text-gray-700">Mensualité calculée :</span>
                  <span className="font-medium">
                    {calculatedFromSalePrice.monthlyPayment > 0 ? formatCurrency(calculatedFromSalePrice.monthlyPayment) : '-'}
                  </span>
                </div>
              </div>
            )}

            <Button 
              onClick={handleApplySalePrice}
              disabled={targetSalePrice <= equipmentPurchasePrice}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {hideFinancialDetails ? 'Appliquer ce prix de vente' : 'Appliquer cette configuration'}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MarginCalculator;
