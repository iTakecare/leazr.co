
import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Loader2 } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { calculateFinancedAmount, getCoefficientRateSync, getCoefficientRate } from "@/utils/calculator";

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
  const calculationAttemptedRef = useRef(false);
  const equipmentSignatureRef = useRef("");
  const totalPaymentRef = useRef(0);
  
  // Ne pas rendre le composant si les IDs nécessaires sont manquants
  if (!ambassadorId || !commissionLevelId) {
    return null;
  }

  // Nous utilisons un effect simple avec une dépendance sur equipmentList.length uniquement
  useEffect(() => {
    // Ne pas calculer si déjà calculé ou si les équipements sont vides
    if (!equipmentList || equipmentList.length === 0) return;
    
    // Ne pas recalculer si le montant total n'a pas changé de manière significative
    const newTotalMonthlyPayment = totalMonthlyPayment || 0;
    if (Math.abs(totalPaymentRef.current - newTotalMonthlyPayment) < 0.01) return;
    totalPaymentRef.current = newTotalMonthlyPayment;
    
    // Calculer une empreinte des équipements une seule fois
    if (calculationAttemptedRef.current) return;
    calculationAttemptedRef.current = true;
    
    // Calculer le montant financé à partir de la mensualité et du coefficient applicable
    const calculateCommission = async () => {
      setIsCalculating(true);
      
      try {
        // Importer dynamiquement pour éviter les cycles de dépendances
        const { calculateCommissionByLevel } = await import('@/utils/calculator');
        
        // D'abord, estimer le montant financé avec un coefficient de départ
        // pour déterminer la bonne tranche de coefficient
        let initialCoefficient = 3.27; // Valeur moyenne pour commencer
        let financedAmount = calculateFinancedAmount(newTotalMonthlyPayment, initialCoefficient);
        
        // Maintenant, obtenir le coefficient précis basé sur le montant financé estimé
        const preciseCoefficient = await getCoefficientRate(financedAmount);
        
        // Recalculer le montant financé avec le coefficient précis
        if (preciseCoefficient > 0) {
          financedAmount = calculateFinancedAmount(newTotalMonthlyPayment, preciseCoefficient);
        }
        
        console.log(`Commission Preview: Mensualité ${newTotalMonthlyPayment}€, Coefficient ${preciseCoefficient}, Montant financé ${financedAmount}€`);
        
        // Calculer la commission basée sur le montant financé
        const commissionData = await calculateCommissionByLevel(
          financedAmount,
          commissionLevelId,
          'ambassador',
          ambassadorId
        );
        
        if (commissionData) {
          setCommission({
            amount: commissionData.amount || 0,
            rate: commissionData.rate || 0,
            levelName: commissionData.levelName || ""
          });
        }
      } catch (error) {
        console.error("Error calculating commission:", error);
      } finally {
        setIsCalculating(false);
      }
    };
    
    // Lancer le calcul après un court délai
    const timer = setTimeout(calculateCommission, 300);
    
    // Nettoyage
    return () => clearTimeout(timer);
  }, [ambassadorId, commissionLevelId, equipmentList.length, totalMonthlyPayment]); // Ajout de totalMonthlyPayment aux dépendances

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
