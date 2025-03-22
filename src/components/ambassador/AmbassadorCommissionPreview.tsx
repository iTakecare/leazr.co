
import React, { useEffect, useState } from "react";
import { formatCurrency } from "@/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Equipment } from "@/types/equipment";
import { calculateCommissionByLevel } from "@/utils/calculator";
import { Loader2 } from "lucide-react";

interface AmbassadorCommissionPreviewProps {
  totalMonthlyPayment: number;
  ambassadorId?: string;
  commissionLevelId?: string;
  equipmentList: Equipment[];
}

const AmbassadorCommissionPreview = ({
  totalMonthlyPayment,
  ambassadorId,
  commissionLevelId,
  equipmentList,
}: AmbassadorCommissionPreviewProps) => {
  const [commission, setCommission] = useState<number>(0);
  const [commissionRate, setCommissionRate] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [levelName, setLevelName] = useState<string>("");

  // Calcul du montant total de l'équipement
  const totalEquipmentAmount = equipmentList.reduce((sum, item) => 
    sum + (item.purchasePrice * item.quantity), 0);

  useEffect(() => {
    const calculateCommission = async () => {
      if (totalEquipmentAmount <= 0) {
        setCommission(0);
        return;
      }

      setLoading(true);
      try {
        const { rate, amount, levelName: name } = await calculateCommissionByLevel(
          totalEquipmentAmount,
          commissionLevelId,
          'ambassador',
          ambassadorId
        );
        
        setCommissionRate(rate);
        setCommission(amount);
        if (name) setLevelName(name);
      } catch (error) {
        console.error("Erreur lors du calcul de la commission:", error);
      } finally {
        setLoading(false);
      }
    };

    calculateCommission();
  }, [totalEquipmentAmount, ambassadorId, commissionLevelId]);

  return (
    <Card className="border-primary/20">
      <CardHeader className="bg-primary/5">
        <CardTitle className="text-lg">Votre commission</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
            <span>Calcul en cours...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {levelName && (
              <div className="text-sm text-muted-foreground">
                Barème <span className="font-semibold">{levelName}</span>
              </div>
            )}
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Mensualité totale</div>
                <div className="font-medium">{formatCurrency(totalMonthlyPayment)}</div>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <div className="text-lg font-semibold text-primary">
                Commission : {formatCurrency(commission)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Payable à la signature du contrat par le client
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AmbassadorCommissionPreview;
