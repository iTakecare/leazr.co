
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatters";
import { Minus, Plus, Info } from "lucide-react";
import { calculateCommissionByLevel } from "@/utils/calculator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import AmbassadorCommissionPreview from "@/components/ambassador/AmbassadorCommissionPreview";

interface EquipmentListProps {
  equipmentList: any[];
  editingId: string | null;
  startEditing: (id: string) => void;
  removeFromList: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  totalMonthlyPayment: number;
  globalMarginAdjustment: {
    amount: number;
    newCoef: number;
    active: boolean;
    marginDifference: number;
  };
  toggleAdaptMonthlyPayment: () => void;
  hideFinancialDetails?: boolean;
  ambassadorId?: string;
  commissionLevelId?: string;
  onCommissionCalculated?: (commission: number) => void;
}

const EquipmentList = ({
  equipmentList,
  editingId,
  startEditing,
  removeFromList,
  updateQuantity,
  totalMonthlyPayment,
  globalMarginAdjustment,
  toggleAdaptMonthlyPayment,
  hideFinancialDetails = false,
  ambassadorId,
  commissionLevelId,
  onCommissionCalculated
}: EquipmentListProps) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [equipmentToDelete, setEquipmentToDelete] = useState<string | null>(null);
  
  const handleDeleteClick = (id: string) => {
    setEquipmentToDelete(id);
    setShowConfirm(true);
  };
  
  const confirmDelete = () => {
    if (equipmentToDelete) {
      removeFromList(equipmentToDelete);
      setEquipmentToDelete(null);
    }
    setShowConfirm(false);
  };
  
  const cancelDelete = () => {
    setEquipmentToDelete(null);
    setShowConfirm(false);
  };

  if (equipmentList.length === 0) {
    return (
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-6 flex flex-col items-center justify-center h-64 text-center">
          <Info className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Aucun équipement ajouté</h3>
          <p className="text-muted-foreground">
            Utilisez le formulaire à gauche pour ajouter des équipements à votre offre.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle>Liste des équipements</CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Équipement</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Prix unitaire</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Qté</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {equipmentList.map((item) => (
                  <tr key={item.id} className={editingId === item.id ? "bg-blue-50" : ""}>
                    <td className="px-4 py-3 text-sm">
                      {item.title}
                      {!hideFinancialDetails && (
                        <div className="text-xs text-gray-500 mt-1">
                          Marge: {item.margin}%
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {formatCurrency(item.purchasePrice)}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <div className="flex items-center justify-center">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                          disabled={item.quantity <= 1 || editingId === item.id}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="mx-2 min-w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={editingId === item.id}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {formatCurrency(item.purchasePrice * item.quantity)}
                      {!hideFinancialDetails && item.monthlyPayment && (
                        <div className="text-xs text-gray-500 mt-1">
                          {formatCurrency(item.monthlyPayment * item.quantity)}/mois
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditing(item.id)}
                          disabled={editingId !== null}
                          className="h-7 text-xs"
                        >
                          Modifier
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(item.id)}
                          disabled={editingId !== null}
                          className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          Supprimer
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="px-4 py-3 border-t bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="text-sm font-medium">Total des équipements:</div>
              <div className="text-sm font-medium">
                {formatCurrency(
                  equipmentList.reduce(
                    (sum, item) => sum + item.purchasePrice * item.quantity,
                    0
                  )
                )}
              </div>
            </div>
            
            {!hideFinancialDetails && globalMarginAdjustment.amount !== 0 && (
              <div className="flex justify-between items-center mt-2">
                <div className="text-sm text-gray-500">
                  Ajustement global de marge ({globalMarginAdjustment.marginDifference.toFixed(2)}%)
                </div>
                <div className="text-sm text-gray-500">
                  {formatCurrency(globalMarginAdjustment.amount)}
                </div>
              </div>
            )}
            
            {!hideFinancialDetails && (
              <div className="mt-4 flex items-center">
                <Switch 
                  id="adapt-monthly-payment"
                  checked={globalMarginAdjustment.active}
                  onCheckedChange={toggleAdaptMonthlyPayment}
                />
                <label 
                  htmlFor="adapt-monthly-payment" 
                  className="ml-2 text-sm text-gray-600 cursor-pointer"
                >
                  Adapter la mensualité au nouveau coefficient
                </label>
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col p-4 border-t bg-gray-50">
          <div className="w-full flex justify-between items-center">
            <div className="text-base font-medium">Mensualité totale:</div>
            <div className="text-xl font-bold text-blue-600">
              {formatCurrency(totalMonthlyPayment)}<span className="text-sm font-normal text-gray-500">/mois</span>
            </div>
          </div>
          
          {ambassadorId && commissionLevelId && (
            <div className="w-full mt-4">
              <AmbassadorCommissionPreview 
                totalMonthlyPayment={totalMonthlyPayment}
                ambassadorId={ambassadorId}
                commissionLevelId={commissionLevelId}
                equipmentList={equipmentList}
                onCommissionCalculated={onCommissionCalculated}
              />
            </div>
          )}
        </CardFooter>
      </Card>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cet équipement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action ne peut pas être annulée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EquipmentList;
