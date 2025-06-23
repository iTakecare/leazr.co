
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Pencil, Plus, Minus } from "lucide-react";
import { Equipment } from "@/types/equipment";
import { formatCurrency } from "@/utils/formatters";
import CommissionDisplay from "@/components/ui/CommissionDisplay";
import FinancialSummary from "@/components/offer/FinancialSummary";

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
  calculations?: any;
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
  calculations
}: EquipmentListProps) => {
  const handleQuantityChange = (id: string, newQuantity: number) => {
    updateQuantity(id, newQuantity);
  };

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
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {!hideFinancialDetails && calculations && (
        <FinancialSummary 
          calculations={calculations}
          useGlobalAdjustment={globalMarginAdjustment.active}
        />
      )}
      
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
