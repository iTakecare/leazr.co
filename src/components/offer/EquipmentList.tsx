import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Edit, Plus, MinusCircle, PlusCircle, DollarSign } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { calculateCommissionByLevel } from "@/utils/calculator";
import CommissionDisplay from "@/components/ui/CommissionDisplay";
import { toast } from "sonner";

interface EquipmentListProps {
  equipmentList: any[];
  startEditing: (id: string) => void;
  removeFromList: (id: string) => void;
  updateQuantity: (id: string, newQuantity: number) => void;
  editingId: string | null;
  totalMonthlyPayment: number;
  globalMarginAdjustment: {
    amount: number;
    newCoef: number;
    active: boolean;
  };
  toggleAdaptMonthlyPayment: () => void;
  hideFinancialDetails?: boolean;
  ambassadorId?: string;
  commissionLevelId?: string;
}

const EquipmentList = ({
  equipmentList,
  startEditing,
  removeFromList,
  updateQuantity,
  editingId,
  totalMonthlyPayment,
  globalMarginAdjustment,
  toggleAdaptMonthlyPayment,
  hideFinancialDetails = false,
  ambassadorId,
  commissionLevelId
}: EquipmentListProps) => {
  const [commission, setCommission] = useState({ amount: 0, rate: 0, levelName: "" });
  const [isCalculating, setIsCalculating] = useState(false);

  // Calcul de la commission basée sur le total de l'offre
  useEffect(() => {
    const calculateCommission = async () => {
      if (!totalMonthlyPayment || totalMonthlyPayment === 0) {
        setCommission({ amount: 0, rate: 0, levelName: "" });
        return;
      }

      setIsCalculating(true);
      try {
        console.log(`Calculating commission for ambassador ${ambassadorId} with level ${commissionLevelId}`);
        // Calculer la commission en fonction du barème spécifique de l'ambassadeur
        const commissionData = await calculateCommissionByLevel(
          globalMarginAdjustment.amount + equipmentList.reduce((sum, eq) => sum + (eq.purchasePrice * eq.quantity), 0),
          commissionLevelId,
          'ambassador',
          ambassadorId
        );
        
        // Fix for TypeScript error - ensure levelName is a string even if it's undefined
        setCommission({ 
          amount: commissionData.amount, 
          rate: commissionData.rate,
          levelName: commissionData.levelName || ""
        });
        console.log("Commission calculated:", commissionData);
      } catch (error) {
        console.error("Error calculating commission:", error);
        toast.error("Erreur lors du calcul de la commission");
      } finally {
        setIsCalculating(false);
      }
    };

    if (equipmentList.length > 0 && (ambassadorId || commissionLevelId)) {
      calculateCommission();
    }
  }, [totalMonthlyPayment, equipmentList, globalMarginAdjustment.amount, ambassadorId, commissionLevelId]);

  if (equipmentList.length === 0) {
    return (
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-2 border-b">
          <CardTitle>Liste d'équipements</CardTitle>
        </CardHeader>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <p>Ajoutez des équipements à votre offre</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-2 border-b">
          <CardTitle>Liste d'équipements</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 pb-0">
          <div className="space-y-4">
            {equipmentList.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-gray-100"
              >
                <div className="flex-1 mb-2 sm:mb-0">
                  <div className="font-semibold">{item.title}</div>
                  {!hideFinancialDetails && (
                    <div className="text-sm text-muted-foreground">
                      Prix: {formatCurrency(item.purchasePrice)} - Marge: {item.margin}%
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                    >
                      <MinusCircle className="h-4 w-4" />
                    </Button>
                    <span className="w-6 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEditing(item.id)}
                      disabled={!!editingId}
                      className="h-7 w-7 text-blue-600"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFromList(item.id)}
                      disabled={!!editingId}
                      className="h-7 w-7 text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="py-4 border-t">
            <div className="flex justify-between items-center">
              <div className="font-semibold">Mensualité totale</div>
              <div className="text-lg font-bold">
                {formatCurrency(totalMonthlyPayment)}
              </div>
            </div>
            {!hideFinancialDetails && (
              <div className="text-sm text-right text-muted-foreground">
                {globalMarginAdjustment.active && (
                  <span>
                    Coefficient: {globalMarginAdjustment.newCoef.toFixed(2)}
                  </span>
                )}
              </div>
            )}
            {commission.amount > 0 && (
              <div className="mt-2 flex justify-between items-center">
                <div className="font-semibold">Votre commission</div>
                <div className="text-green-600 font-bold flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {formatCurrency(commission.amount)}
                  <span className="text-sm text-muted-foreground">
                    ({commission.rate}%)
                  </span>
                </div>
              </div>
            )}
          </div>
          
          {ambassadorId && (
            <div className="mt-4 pt-4 border-t border-dashed">
              <CommissionDisplay 
                ambassadorId={ambassadorId} 
                commissionLevelId={commissionLevelId} 
              />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default EquipmentList;
