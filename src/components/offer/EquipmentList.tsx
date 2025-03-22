
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Edit, Plus, MinusCircle, PlusCircle, DollarSign } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { calculateCommissionByLevel } from "@/utils/calculator";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

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
    marginDifference?: number;
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
  const [commission, setCommission] = useState<{ amount: number; rate: number; levelName: string }>({ 
    amount: 0, 
    rate: 0, 
    levelName: "" 
  });
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    const calculateCommission = async () => {
      if (!totalMonthlyPayment || totalMonthlyPayment === 0) {
        return;
      }

      setIsCalculating(true);
      try {
        console.log(`Calculating commission for ambassador ${ambassadorId} with level ${commissionLevelId}`);
        const totalEquipmentAmount = globalMarginAdjustment.amount + equipmentList.reduce((sum, eq) => sum + (eq.purchasePrice * eq.quantity), 0);
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

  const totalBaseAmount = equipmentList.reduce((sum, eq) => sum + (eq.purchasePrice * eq.quantity), 0);
  const totalMarginAmount = globalMarginAdjustment.amount;
  const globalMarginPercentage = totalMarginAmount > 0 && totalBaseAmount > 0 
    ? ((totalMarginAmount / totalBaseAmount) * 100).toFixed(2) 
    : "0.00";
  
  const marginDifference = globalMarginAdjustment.marginDifference || 0;
  const totalMarginWithDifference = totalMarginAmount + marginDifference;

  return (
    <>
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-2 border-b">
          <CardTitle>Liste des équipements</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Équipement</th>
                  <th className="text-left py-2">Prix unitaire</th>
                  <th className="text-center py-2">Qté</th>
                  {!hideFinancialDetails && <th className="text-right py-2">Marge</th>}
                  <th className="text-right py-2">Total</th>
                  <th className="text-right py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {equipmentList.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-3">{item.title}</td>
                    <td className="py-3">{hideFinancialDetails ? "—" : formatCurrency(item.purchasePrice)}</td>
                    <td className="py-3">
                      <div className="flex items-center justify-center gap-1">
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
                    </td>
                    {!hideFinancialDetails && (
                      <td className="text-right py-3">{item.margin.toFixed(2)} %</td>
                    )}
                    <td className="text-right py-3 text-blue-600 font-medium">
                      {formatCurrency((item.monthlyPayment || 0) * item.quantity)}
                    </td>
                    <td className="text-right py-3">
                      <div className="flex items-center justify-end gap-1">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-4 pb-2 border-t mt-2">
            <div className="font-medium">Mensualité totale : </div>
            <div className="text-lg font-bold text-blue-600 ml-2">
              {formatCurrency(totalMonthlyPayment)}
            </div>
          </div>
          
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm mt-4">
        <CardHeader className="pb-2 border-b">
          <CardTitle>Récapitulatif global</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            {!hideFinancialDetails && (
              <>
                <div className="flex justify-between items-center">
                  <div>Coefficient actuel :</div>
                  <div className="font-medium">{globalMarginAdjustment.newCoef.toFixed(2)}</div>
                </div>
                <div className="flex justify-between items-center">
                  <div>Nouveau coefficient :</div>
                  <div className="font-medium">{globalMarginAdjustment.newCoef.toFixed(2)}</div>
                </div>
                <div className="flex justify-between items-center">
                  <div>Marge globale :</div>
                  <div className="font-medium">{globalMarginPercentage}%</div>
                </div>
                <div className="flex justify-between items-center">
                  <div>Marge totale en euros :</div>
                  <div className="font-medium">{formatCurrency(totalMarginAmount)}</div>
                </div>
                {marginDifference !== 0 && (
                  <>
                    <div className="flex justify-between items-center">
                      <div>Différence de marge :</div>
                      <div className="font-medium text-green-600">{formatCurrency(marginDifference)}</div>
                    </div>
                    <div className="flex justify-between items-center border-t pt-2">
                      <div>Total marge avec différence :</div>
                      <div className="font-medium text-green-600">{formatCurrency(totalMarginWithDifference)}</div>
                    </div>
                  </>
                )}
              </>
            )}
            
            <div className="pt-2 flex items-center justify-between border-t mt-3">
              <label htmlFor="adapt-monthly" className="cursor-pointer">
                Adapter la mensualité au nouveau coefficient
              </label>
              <Switch
                id="adapt-monthly"
                checked={globalMarginAdjustment.active}
                onCheckedChange={toggleAdaptMonthlyPayment}
              />
            </div>
            
            <div className="flex justify-between items-center pt-4 border-t mt-3">
              <div className="text-lg font-medium text-blue-600">Mensualité totale :</div>
              <div className="text-lg font-bold text-blue-600">{formatCurrency(totalMonthlyPayment)}</div>
            </div>
            
            {commission?.amount > 0 && (
              <div className="flex justify-between items-center pt-2">
                <div className="font-medium">Votre commission :</div>
                <div className="text-green-600 font-medium flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {formatCurrency(commission.amount)}
                  {commission.rate > 0 && (
                    <span className="text-sm text-muted-foreground">({commission.rate}%)</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default EquipmentList;
