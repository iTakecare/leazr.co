
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Loader2 } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { calculateCommissionByLevel } from "@/utils/calculator";

interface AmbassadorCommissionPreviewProps {
  totalMonthlyPayment: number;
  ambassadorId?: string;
  commissionLevelId?: string;
  equipmentList: any[];
}

const AmbassadorCommissionPreview = ({
  totalMonthlyPayment,
  ambassadorId,
  commissionLevelId,
  equipmentList
}: AmbassadorCommissionPreviewProps) => {
  const [commission, setCommission] = useState<{ amount: number; rate: number; levelName: string }>({
    amount: 0,
    rate: 0,
    levelName: ""
  });
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastCalculationParams, setLastCalculationParams] = useState<string>("");

  // Calcul à la demande plutôt que réactif (useEffect)
  React.useEffect(() => {
    // Vérifier si on a déjà les informations nécessaires
    if (!ambassadorId || !commissionLevelId || !equipmentList.length) {
      return;
    }

    // Créer une signature unique pour les paramètres actuels
    const totalEquipmentAmount = equipmentList.reduce((sum, eq) => sum + (eq.purchasePrice * eq.quantity), 0);
    const currentCalculationParams = `${totalEquipmentAmount}-${commissionLevelId}-${ambassadorId}`;
    
    // Éviter les calculs redondants en vérifiant si les paramètres ont changé
    if (currentCalculationParams === lastCalculationParams) {
      return;
    }

    // Mémoriser les paramètres actuels
    setLastCalculationParams(currentCalculationParams);
    
    // Calculer la commission uniquement quand nécessaire
    setIsCalculating(true);
    
    // Utiliser setTimeout pour éviter le blocage de l'interface
    const timer = setTimeout(async () => {
      try {
        const commissionData = await calculateCommissionByLevel(
          totalEquipmentAmount,
          commissionLevelId,
          'ambassador',
          ambassadorId
        );
        
        setCommission({
          amount: commissionData.amount,
          rate: commissionData.rate,
          levelName: commissionData.levelName || ""
        });
      } catch (error) {
        console.error("Error calculating commission:", error);
      } finally {
        setIsCalculating(false);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [ambassadorId, commissionLevelId, equipmentList]);

  if (!ambassadorId || !commissionLevelId) {
    return null;
  }

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="pb-2 border-b">
        <CardTitle>Votre commission</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between py-2">
          {isCalculating ? (
            <div className="flex items-center text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Calcul en cours...
            </div>
          ) : (
            <>
              <div className="font-medium">Montant de commission:</div>
              <div className="text-green-600 font-medium flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                {formatCurrency(commission.amount)}
                {commission.rate > 0 && (
                  <span className="text-sm text-muted-foreground">({commission.rate}%)</span>
                )}
              </div>
            </>
          )}
        </div>
        {commission.levelName && (
          <div className="mt-2 text-sm text-muted-foreground">
            Niveau de commission: {commission.levelName}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AmbassadorCommissionPreview;
