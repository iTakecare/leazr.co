
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPercentage } from "@/utils/formatters";
import { Trash2, Edit, Plus, Minus } from "lucide-react";
import { Equipment, GlobalMarginAdjustment } from "@/types/equipment";

interface EquipmentListProps {
  equipmentList: Equipment[];
  editingId: string | null;
  startEditing: (id: string) => void;
  removeFromList: (id: string) => void;
  updateQuantity: (id: string, change: number) => void;
  totalMonthlyPayment: number;
  globalMarginAdjustment: GlobalMarginAdjustment;
}

const EquipmentList: React.FC<EquipmentListProps> = ({
  equipmentList,
  editingId,
  startEditing,
  removeFromList,
  updateQuantity,
  totalMonthlyPayment,
  globalMarginAdjustment
}) => {
  if (equipmentList.length === 0) {
    return (
      <Card className="shadow-md border-gray-200">
        <CardHeader className="pb-4 border-b">
          <CardTitle className="text-lg font-medium">Liste des équipements</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-center py-10 text-gray-500">
            Aucun équipement ajouté
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md border-gray-200">
      <CardHeader className="pb-4 border-b">
        <CardTitle className="text-lg font-medium">Liste des équipements</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left font-medium p-3">Équipement</th>
                <th className="text-right font-medium p-3">Prix unitaire</th>
                <th className="text-center font-medium p-3">Qté</th>
                <th className="text-right font-medium p-3">Marge</th>
                <th className="text-right font-medium p-3">Mensualité unitaire</th>
                <th className="text-right font-medium p-3">Mensualité totale</th>
                <th className="text-center font-medium p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {equipmentList.map((equipment) => (
                <tr 
                  key={equipment.id}
                  className={`border-b hover:bg-gray-50 ${
                    editingId === equipment.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <td className="p-3 text-left">
                    <div className="font-medium">{equipment.title}</div>
                  </td>
                  <td className="p-3 text-right">
                    {formatCurrency(equipment.purchasePrice)}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6" 
                        onClick={() => updateQuantity(equipment.id, -1)}
                        disabled={equipment.quantity <= 1 || editingId !== null}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="mx-2 w-4 text-center">{equipment.quantity}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6" 
                        onClick={() => updateQuantity(equipment.id, 1)}
                        disabled={editingId !== null}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    {formatPercentage(equipment.margin)}
                  </td>
                  <td className="p-3 text-right font-medium text-blue-600">
                    {formatCurrency(equipment.monthlyPayment || 0)}
                  </td>
                  <td className="p-3 text-right font-medium text-blue-600">
                    {formatCurrency((equipment.monthlyPayment || 0) * equipment.quantity)}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center space-x-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        onClick={() => startEditing(equipment.id)}
                        disabled={editingId !== null}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-red-600 hover:text-red-800 hover:bg-red-50"
                        onClick={() => removeFromList(equipment.id)}
                        disabled={editingId !== null}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-gray-50 font-medium">
                <td colSpan={5} className="p-3 text-right">
                  Mensualité totale:
                </td>
                <td colSpan={2} className="p-3 text-right text-blue-600 font-bold">
                  {formatCurrency(totalMonthlyPayment)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default EquipmentList;
