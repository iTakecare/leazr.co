import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Calculator, Calendar, Euro, CheckCircle2, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { differenceInMonths, parseISO } from "date-fns";

interface ContractBreakevenCardProps {
  contract: {
    monthly_payment: number;
    contract_start_date: string | null;
    contract_duration: number | null;
  };
  equipmentCost: number;
}

const ContractBreakevenCard: React.FC<ContractBreakevenCardProps> = ({
  contract,
  equipmentCost,
}) => {
  const monthlyPayment = contract.monthly_payment || 0;
  const duration = contract.contract_duration || 36;
  const startDate = contract.contract_start_date 
    ? parseISO(contract.contract_start_date) 
    : null;
  
  // Calcul du breakeven (nombre de mois pour rembourser l'équipement)
  const breakevenMonths = monthlyPayment > 0 
    ? Math.ceil(equipmentCost / monthlyPayment) 
    : duration;
  
  // Mois écoulés depuis le début du contrat
  const monthsElapsed = startDate 
    ? Math.max(0, differenceInMonths(new Date(), startDate))
    : 0;
  
  // Statut de rentabilité
  const isProfitable = monthsElapsed >= breakevenMonths;
  const monthsAfterBreakeven = Math.max(0, monthsElapsed - breakevenMonths);
  const monthsUntilBreakeven = Math.max(0, breakevenMonths - monthsElapsed);
  
  // Bénéfice net après breakeven
  const netProfitAfterBreakeven = monthsAfterBreakeven * monthlyPayment;
  
  // Revenu total sur la durée du contrat
  const totalRevenue = monthlyPayment * duration;
  
  // Marge totale sur le contrat
  const totalMargin = totalRevenue - equipmentCost;
  
  // Progression vers breakeven (en pourcentage)
  const breakevenProgress = Math.min(100, (monthsElapsed / breakevenMonths) * 100);
  
  // Amortissement linéaire mensuel
  const monthlyAmortization = equipmentCost / duration;
  
  // Marge mensuelle après amortissement
  const monthlyMarginAfterAmortization = monthlyPayment - monthlyAmortization;

  if (equipmentCost <= 0 || monthlyPayment <= 0) {
    return null;
  }

  return (
    <Card className="border-l-4 border-l-emerald-500">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            <CardTitle className="text-lg">Rentabilité</CardTitle>
          </div>
          <Badge 
            variant={isProfitable ? "default" : "secondary"}
            className={isProfitable ? "bg-emerald-500 hover:bg-emerald-600" : ""}
          >
            {isProfitable ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Rentable
              </>
            ) : (
              <>
                <Clock className="h-3 w-3 mr-1" />
                En remboursement
              </>
            )}
          </Badge>
        </div>
        <CardDescription>
          Analyse du point de rentabilité du contrat
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progression vers breakeven */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progression vers rentabilité</span>
            <span className="font-medium">
              {monthsElapsed} / {breakevenMonths} mois
            </span>
          </div>
          <Progress value={breakevenProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {isProfitable 
              ? `Rentable depuis ${monthsAfterBreakeven} mois` 
              : `Rentable dans ${monthsUntilBreakeven} mois`}
          </p>
        </div>

        {/* Métriques principales */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Euro className="h-3 w-3" />
              Prix d'achat
            </div>
            <p className="font-semibold">{formatCurrency(equipmentCost)}</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Mensualité
            </div>
            <p className="font-semibold">{formatCurrency(monthlyPayment)}</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calculator className="h-3 w-3" />
              Breakeven
            </div>
            <p className="font-semibold">{breakevenMonths} mois</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              Marge totale
            </div>
            <p className="font-semibold text-emerald-600">{formatCurrency(totalMargin)}</p>
          </div>
        </div>

        {/* Détail de l'amortissement */}
        <div className="pt-2 border-t space-y-2">
          <h4 className="text-sm font-medium">Amortissement linéaire</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Achat/mois:</span>
              <span className="font-medium">{formatCurrency(monthlyAmortization)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Marge/mois:</span>
              <span className="font-medium text-emerald-600">
                {formatCurrency(monthlyMarginAfterAmortization)}
              </span>
            </div>
          </div>
        </div>

        {/* Bénéfice net si rentable */}
        {isProfitable && netProfitAfterBreakeven > 0 && (
          <div className="pt-2 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Bénéfice net accumulé:</span>
              <span className="font-bold text-lg text-emerald-600">
                {formatCurrency(netProfitAfterBreakeven)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContractBreakevenCard;
