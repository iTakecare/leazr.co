
import React, { useState, useRef } from "react";
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
  const calculationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastParametersRef = useRef<string>("");
  const isInitialMountRef = useRef(true);
  
  // Fonction pour calculer la commission au clic du bouton
  const handleCalculateCommission = React.useCallback(() => {
    // Ne pas calculer si les informations nécessaires sont manquantes
    if (!ambassadorId || !commissionLevelId || !equipmentList.length) {
      return;
    }

    // Calculer le montant total de l'équipement
    const totalEquipmentAmount = equipmentList.reduce((sum, eq) => {
      const price = typeof eq.purchasePrice === 'number' ? eq.purchasePrice : 0;
      const quantity = typeof eq.quantity === 'number' ? eq.quantity : 0;
      return sum + (price * quantity);
    }, 0);
    
    // Pas besoin de calculer si le montant est trop petit
    if (totalEquipmentAmount < 10) {
      return;
    }
    
    // Créer une signature pour les paramètres actuels
    const currentParams = `${totalEquipmentAmount.toFixed(2)}-${commissionLevelId}-${ambassadorId}`;
    
    // Éviter les calculs redondants si les paramètres n'ont pas changé
    if (currentParams === lastParametersRef.current && !isInitialMountRef.current) {
      return;
    }
    
    // Mettre à jour la référence des paramètres
    lastParametersRef.current = currentParams;
    isInitialMountRef.current = false;
    
    // Annuler tout calcul précédent en attente
    if (calculationTimerRef.current) {
      clearTimeout(calculationTimerRef.current);
    }
    
    // Différer le calcul pour éviter les calculs trop fréquents
    setIsCalculating(true);
    
    calculationTimerRef.current = setTimeout(async () => {
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
        calculationTimerRef.current = null;
      }
    }, 300);
  }, [ambassadorId, commissionLevelId, equipmentList]);

  // Calculer la commission uniquement au montage du composant
  React.useEffect(() => {
    // Vérification des conditions nécessaires pour calculer
    if (equipmentList.length > 0 && ambassadorId && commissionLevelId && isInitialMountRef.current) {
      handleCalculateCommission();
    }
    
    // Nettoyage
    return () => {
      if (calculationTimerRef.current) {
        clearTimeout(calculationTimerRef.current);
      }
    };
  }, [handleCalculateCommission]);

  // Ne pas rendre le composant si les IDs nécessaires sont manquants
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
                {commission.amount > 0 ? formatCurrency(commission.amount) : "0,00 €"}
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
