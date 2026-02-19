
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Percent, Euro, AlertTriangle, Tag } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";

export interface DiscountData {
  enabled: boolean;
  type: 'percentage' | 'amount';
  value: number;
  discountAmount: number; // Montant calculé de la remise en €
  monthlyPaymentBeforeDiscount: number;
  monthlyPaymentAfterDiscount: number;
}

interface DiscountInputProps {
  monthlyPayment: number; // Mensualité totale avant remise
  margin?: number; // Marge totale (pour avertissement)
  coefficient?: number; // Coefficient du bailleur pour recalcul de la marge
  totalPurchasePrice?: number; // Prix d'achat total des équipements
  discountData: DiscountData;
  onDiscountChange: (data: DiscountData) => void;
  showMarginImpact?: boolean; // Afficher l'impact sur la marge (admin uniquement)
  label?: string;
  compact?: boolean;
}

const DiscountInput: React.FC<DiscountInputProps> = ({
  monthlyPayment,
  margin = 0,
  coefficient = 0,
  totalPurchasePrice = 0,
  discountData,
  onDiscountChange,
  showMarginImpact = true,
  label = "Remise commerciale",
  compact = false,
}) => {
  // Calcul correct de la marge via la formule Grenke
  const canCalculateRealMargin = coefficient > 0 && totalPurchasePrice > 0;
  
  const marginBeforeEuro = canCalculateRealMargin
    ? (monthlyPayment * 100 / coefficient) - totalPurchasePrice
    : margin;
  const marginBeforePercent = canCalculateRealMargin && totalPurchasePrice > 0
    ? (marginBeforeEuro / totalPurchasePrice) * 100
    : 0;

  const discountedMonthly = discountData.monthlyPaymentAfterDiscount;
  const marginAfterEuro = canCalculateRealMargin
    ? (discountedMonthly * 100 / coefficient) - totalPurchasePrice
    : margin - discountData.discountAmount;
  const marginAfterPercent = canCalculateRealMargin && totalPurchasePrice > 0
    ? (marginAfterEuro / totalPurchasePrice) * 100
    : 0;
  const handleToggle = (enabled: boolean) => {
    if (!enabled) {
      onDiscountChange({
        enabled: false,
        type: 'percentage',
        value: 0,
        discountAmount: 0,
        monthlyPaymentBeforeDiscount: monthlyPayment,
        monthlyPaymentAfterDiscount: monthlyPayment,
      });
    } else {
      onDiscountChange({
        ...discountData,
        enabled: true,
        monthlyPaymentBeforeDiscount: monthlyPayment,
        monthlyPaymentAfterDiscount: monthlyPayment,
      });
    }
  };

  const handleTypeChange = (type: 'percentage' | 'amount') => {
    const newData = { ...discountData, type, value: 0 };
    recalculate(newData);
  };

  const handleValueChange = (value: number) => {
    const newData = { ...discountData, value };
    recalculate(newData);
  };

  const recalculate = (data: Partial<DiscountData>) => {
    const type = data.type || discountData.type;
    const value = data.value ?? discountData.value;
    
    let discountAmount = 0;
    if (type === 'percentage') {
      discountAmount = (monthlyPayment * value) / 100;
    } else {
      discountAmount = value;
    }

    // Ensure discount doesn't exceed monthly payment
    discountAmount = Math.min(discountAmount, monthlyPayment);
    discountAmount = Math.max(0, discountAmount);

    onDiscountChange({
      enabled: data.enabled ?? discountData.enabled,
      type,
      value,
      discountAmount,
      monthlyPaymentBeforeDiscount: monthlyPayment,
      monthlyPaymentAfterDiscount: monthlyPayment - discountAmount,
    });
  };

  // Recalculate when monthly payment changes
  useEffect(() => {
    if (discountData.enabled && discountData.value > 0) {
      recalculate({});
    }
  }, [monthlyPayment]);

  const exceedsMargin = marginAfterEuro < 0;

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">{label}</Label>
          </div>
          <Switch
            checked={discountData.enabled}
            onCheckedChange={handleToggle}
          />
        </div>

        {discountData.enabled && (
          <div className="space-y-2 pl-6">
            <div className="flex items-center gap-2">
              <div className="flex rounded-md border overflow-hidden">
                <Button
                  type="button"
                  variant={discountData.type === 'percentage' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 rounded-none px-2"
                  onClick={() => handleTypeChange('percentage')}
                >
                  <Percent className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant={discountData.type === 'amount' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 rounded-none px-2"
                  onClick={() => handleTypeChange('amount')}
                >
                  <Euro className="h-3 w-3" />
                </Button>
              </div>
              <Input
                type="number"
                value={discountData.value || ''}
                onChange={(e) => handleValueChange(parseFloat(e.target.value) || 0)}
                placeholder={discountData.type === 'percentage' ? '10' : '50'}
                className="h-8 w-24"
                min="0"
                max={discountData.type === 'percentage' ? 100 : monthlyPayment}
                step={discountData.type === 'percentage' ? 0.5 : 1}
              />
            </div>
            {discountData.discountAmount > 0 && (
              <div className="text-xs text-muted-foreground">
                -{formatCurrency(discountData.discountAmount)}/mois → {formatCurrency(discountData.monthlyPaymentAfterDiscount)}/mois
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="pb-2 border-b">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            {label}
          </div>
          <Switch
            checked={discountData.enabled}
            onCheckedChange={handleToggle}
          />
        </CardTitle>
      </CardHeader>

      {discountData.enabled && (
        <CardContent className="pt-4 space-y-4">
          {/* Type selector */}
          <div className="flex items-center gap-3">
            <Label className="text-sm text-muted-foreground whitespace-nowrap">Type :</Label>
            <div className="flex rounded-md border overflow-hidden">
              <Button
                type="button"
                variant={discountData.type === 'percentage' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none px-3"
                onClick={() => handleTypeChange('percentage')}
              >
                <Percent className="h-3 w-3 mr-1" />
                Pourcentage
              </Button>
              <Button
                type="button"
                variant={discountData.type === 'amount' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none px-3"
                onClick={() => handleTypeChange('amount')}
              >
                <Euro className="h-3 w-3 mr-1" />
                Montant fixe
              </Button>
            </div>
          </div>

          {/* Value input */}
          <div>
            <Label className="text-sm text-muted-foreground">
              {discountData.type === 'percentage' ? 'Remise (%)' : 'Remise (€)'}
            </Label>
            <Input
              type="number"
              value={discountData.value || ''}
              onChange={(e) => handleValueChange(parseFloat(e.target.value) || 0)}
              placeholder={discountData.type === 'percentage' ? 'Ex: 10' : 'Ex: 50'}
              className="mt-1"
              min="0"
              max={discountData.type === 'percentage' ? 100 : monthlyPayment}
              step={discountData.type === 'percentage' ? 0.5 : 1}
            />
          </div>

          {/* Preview */}
          {discountData.discountAmount > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Mensualité d'origine :</span>
                <span className="line-through text-muted-foreground">
                  {formatCurrency(monthlyPayment)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Remise :</span>
                <span className="text-red-600 font-medium">
                  -{formatCurrency(discountData.discountAmount)}
                  {discountData.type === 'percentage' && ` (${discountData.value}%)`}
                </span>
              </div>
              <div className="flex justify-between items-center bg-green-50 rounded-lg p-2 border border-green-200">
                <span className="text-sm font-medium text-green-800">Mensualité remisée :</span>
                <span className="text-lg font-bold text-green-900">
                  {formatCurrency(discountData.monthlyPaymentAfterDiscount)}
                </span>
              </div>
            </div>
          )}

          {/* Margin impact warning */}
          {showMarginImpact && discountData.discountAmount > 0 && (
            <div className={`rounded-lg p-3 border ${exceedsMargin ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-start gap-2">
                <AlertTriangle className={`h-4 w-4 mt-0.5 ${exceedsMargin ? 'text-red-600' : 'text-amber-600'}`} />
                <div className="text-sm">
                  <div className={`font-medium ${exceedsMargin ? 'text-red-800' : 'text-amber-800'}`}>
                    Impact sur la marge
                  </div>
                  <div className={`text-xs mt-1 ${exceedsMargin ? 'text-red-700' : 'text-amber-700'}`}>
                    Marge avant remise : {formatCurrency(marginBeforeEuro)} {canCalculateRealMargin && `(${marginBeforePercent.toFixed(2)}%)`}
                    <br />
                    Marge après remise : {formatCurrency(Math.max(0, marginAfterEuro))} {canCalculateRealMargin && `(${marginAfterPercent.toFixed(2)}%)`}
                    {exceedsMargin && (
                      <>
                        <br />
                        <span className="font-medium">⚠️ La remise dépasse la marge !</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default DiscountInput;
