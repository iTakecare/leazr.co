
import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Loader2 } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";

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
  const hasCalculatedRef = useRef(false);
  const equipmentSignatureRef = useRef("");
  
  // Ne pas rendre le composant si les IDs nécessaires sont manquants
  if (!ambassadorId || !commissionLevelId) {
    return null;
  }

  // Nous utilisons un effect simple au montage uniquement 
  // pour éviter les recalculs constants
  useEffect(() => {
    // Ne calculer qu'une seule fois, quand les données sont valides
    if (hasCalculatedRef.current || !equipmentList.length) return;
    
    // Calculer une empreinte des équipements pour suivre les changements réels
    const equipmentSignature = JSON.stringify(
      equipmentList.map(eq => ({
        id: eq.id,
        price: eq.purchasePrice,
        quantity: eq.quantity
      }))
    );
    
    // Si l'empreinte est la même, pas besoin de recalculer
    if (equipmentSignature === equipmentSignatureRef.current) return;
    equipmentSignatureRef.current = equipmentSignature;
    
    // Calculer le montant total des équipements
    const totalEquipmentAmount = equipmentList.reduce((sum, eq) => {
      const price = typeof eq.purchasePrice === 'number' ? eq.purchasePrice : 0;
      const quantity = typeof eq.quantity === 'number' ? eq.quantity : 0;
      return sum + (price * quantity);
    }, 0);
    
    // Ne pas calculer pour de petits montants
    if (totalEquipmentAmount < 10) return;
    
    // Marquer comme calculé
    hasCalculatedRef.current = true;
    
    // Le calcul effectif est déplacé dans un import dynamique
    // pour retarder son chargement et réduire l'impact
    const calculateCommission = async () => {
      setIsCalculating(true);
      
      try {
        // Importer dynamiquement pour éviter les cycles de dépendances
        const { calculateCommissionByLevel } = await import('@/utils/calculator');
        
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
    };
    
    // Lancer le calcul après un court délai
    const timer = setTimeout(calculateCommission, 500);
    
    // Nettoyage
    return () => clearTimeout(timer);
  }, [ambassadorId, commissionLevelId, equipmentList]);

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
