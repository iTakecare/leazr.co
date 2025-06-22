
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2, Pencil, Plus, Minus } from "lucide-react";
import { Equipment, Leaser } from "@/types/equipment";
import { formatCurrency } from "@/utils/formatters";
import { calculateFinancedAmount } from "@/utils/calculator";
import CommissionDisplay from "@/components/ui/CommissionDisplay";

interface GlobalMarginAdjustment {
  amount: number;
  newCoef: number;
  active: boolean;
  marginDifference: number;
}

interface EquipmentListProps {
  equipmentList: Equipment[];
  editingId: string | null;
  startEditing: (id: string) => void;
  removeFromList: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  totalMonthlyPayment: number;
  globalMarginAdjustment: GlobalMarginAdjustment;
  toggleAdaptMonthlyPayment: () => void;
  hideFinancialDetails?: boolean;
  ambassadorId?: string;
  commissionLevelId?: string;
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
  commissionLevelId
}: EquipmentListProps) => {
  const editingEquipment = equipmentList.find((item) => item.id === editingId);

  const handleQuantityChange = (id: string, newQuantity: number) => {
    updateQuantity(id, newQuantity);
  };

  const handleAdaptMonthlyPaymentToggle = () => {
    toggleAdaptMonthlyPayment();
  };

  // Calculs pour le récapitulatif
  const totalPurchasePrice = equipmentList.reduce((sum, item) => sum + (item.purchasePrice * item.quantity), 0);
  const totalMarginAmount = globalMarginAdjustment.amount;
  const marginRate = totalPurchasePrice > 0 ? (totalMarginAmount / totalPurchasePrice) * 100 : 0;
  const coefficient = globalMarginAdjustment.newCoef || 3.27;
  const financedAmount = calculateFinancedAmount(totalMonthlyPayment, coefficient);
  const adjustedMonthlyPayment = globalMarginAdjustment.active ? totalMonthlyPayment : (totalPurchasePrice + totalMarginAmount) / coefficient * 100;

  return (
    <div className="space-y-6">
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-2 border-b">
          <CardTitle>Liste des équipements</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    Équipement
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    Prix unitaire
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    Quantité
                  </th>
                  {!hideFinancialDetails && (
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                      Marge
                    </th>
                  )}
                  {!hideFinancialDetails && (
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                      Mensualité
                    </th>
                  )}
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {equipmentList.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {item.title}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatCurrency(item.purchasePrice)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            handleQuantityChange(item.id, Math.max(1, item.quantity - 1))
                          }
                          disabled={item.quantity <= 1}
                          className="h-8 w-8"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const newQuantity = parseInt(e.target.value, 10);
                            if (!isNaN(newQuantity) && newQuantity >= 1) {
                              handleQuantityChange(item.id, newQuantity);
                            }
                          }}
                          className="w-16 text-center h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          min="1"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            handleQuantityChange(item.id, item.quantity + 1)
                          }
                          className="h-8 w-8"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                    {!hideFinancialDetails && (
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {item.margin}%
                      </td>
                    )}
                    {!hideFinancialDetails && (
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatCurrency(item.monthlyPayment || 0)}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => startEditing(item.id)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => removeFromList(item.id)}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-2 border-b">
          <CardTitle>Récapitulatif financier</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-1">
              <div className="text-sm text-gray-600">Prix d'achat total:</div>
              <div className="font-medium text-gray-900">
                {formatCurrency(totalPurchasePrice)}
              </div>
            </div>
            
            {!hideFinancialDetails && (
              <>
                <div className="flex items-center justify-between py-1">
                  <div className="text-sm text-gray-600">Taux de marge:</div>
                  <div className="font-medium text-gray-900">
                    {marginRate.toFixed(2)}%
                  </div>
                </div>
                
                <div className="flex items-center justify-between py-1">
                  <div className="text-sm text-gray-600">Montant de la marge:</div>
                  <div className="font-medium text-green-600">
                    {formatCurrency(totalMarginAmount)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between py-1">
                  <div className="text-sm text-gray-600">Coefficient:</div>
                  <div className="font-medium text-gray-900">
                    {coefficient.toFixed(3)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between py-1">
                  <div className="text-sm text-gray-600">Montant financé:</div>
                  <div className="font-medium text-gray-900">
                    {formatCurrency(financedAmount)}
                  </div>
                </div>
                
                <div className="border-t pt-2 mt-2">
                  <div className="flex items-center justify-between py-1">
                    <div className="font-medium text-gray-900">Mensualité totale:</div>
                    <div className="text-blue-600 font-bold text-lg">
                      {formatCurrency(totalMonthlyPayment)}
                    </div>
                  </div>
                  
                  {globalMarginAdjustment.active && (
                    <div className="flex items-center justify-between py-1">
                      <div className="text-sm text-orange-600">Mensualité ajustée au coefficient:</div>
                      <div className="text-orange-600 font-medium">
                        {formatCurrency(adjustedMonthlyPayment)}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="border-t pt-3 mt-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">
                      Ajuster les mensualités pour atteindre la marge cible:
                    </div>
                    <div>
                      <Switch
                        id="adapt-monthly-payment"
                        checked={globalMarginAdjustment.active}
                        onCheckedChange={handleAdaptMonthlyPaymentToggle}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {hideFinancialDetails && (
              <div className="border-t pt-2 mt-2">
                <div className="flex items-center justify-between py-1">
                  <div className="font-medium text-gray-900">Mensualité totale:</div>
                  <div className="text-blue-600 font-bold text-lg">
                    {formatCurrency(totalMonthlyPayment)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {!hideFinancialDetails && ambassadorId && (
        <CommissionDisplay
          ambassadorId={ambassadorId}
          commissionLevelId={commissionLevelId}
        />
      )}
    </div>
  );
};

export default EquipmentList;
