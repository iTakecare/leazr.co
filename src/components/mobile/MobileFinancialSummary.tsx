import React from "react";
import { DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/utils/formatters";

interface MobileFinancialSummaryProps {
  purchaseAmount: number;
  monthlyPayment: number;
  margin: number;
  marginPercent: number;
  isPurchase?: boolean;
  downPayment?: number;
  financedAmount?: number;
}

const MobileFinancialSummary: React.FC<MobileFinancialSummaryProps> = ({
  purchaseAmount,
  monthlyPayment,
  margin,
  marginPercent,
  isPurchase = false,
  downPayment,
  financedAmount,
}) => {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <DollarSign className="h-4 w-4 text-primary" />
          Résumé financier
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Montant d'achat */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Montant d'achat</span>
          <span className="font-semibold text-sm">{formatCurrency(purchaseAmount)}</span>
        </div>

        {/* Mensualité - sauf mode achat */}
        {!isPurchase && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Mensualité</span>
            <span className="font-semibold text-sm">{formatCurrency(monthlyPayment)}/mois</span>
          </div>
        )}

        {/* Acompte si présent */}
        {downPayment && downPayment > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Acompte</span>
            <span className="font-semibold text-sm text-amber-600">
              {formatCurrency(downPayment)}
            </span>
          </div>
        )}

        {/* Montant financé si différent du montant d'achat */}
        {financedAmount && financedAmount !== purchaseAmount && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Montant financé</span>
            <span className="font-semibold text-sm">{formatCurrency(financedAmount)}</span>
          </div>
        )}

        <Separator />

        {/* Marge */}
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-primary">Marge</span>
          <div className="text-right">
            <span className="font-bold text-sm text-primary">{formatCurrency(margin)}</span>
            <span className="text-xs text-muted-foreground ml-1">
              ({marginPercent.toFixed(1)}%)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MobileFinancialSummary;
