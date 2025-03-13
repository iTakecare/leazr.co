
import React from "react";
import { ChevronUp, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { Equipment, GlobalMarginAdjustment } from "@/types/equipment";
import { formatCurrency } from "@/utils/formatters";

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
  globalMarginAdjustment,
}) => {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Liste des équipements</h2>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4">Équipement</th>
              <th className="text-right py-3 px-4">Prix unitaire</th>
              <th className="text-right py-3 px-4">Qté</th>
              <th className="text-right py-3 px-4">Marge</th>
              <th className="text-right py-3 px-4">Total</th>
              <th className="text-right py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {equipmentList.map((eq) => (
              <tr key={eq.id} className={`border-b ${editingId === eq.id ? 'bg-blue-50' : ''}`}>
                <td className="py-3 px-4">{eq.title}</td>
                <td className="text-right py-3 px-4">
                  {formatCurrency(eq.purchasePrice)}
                </td>
                <td className="text-right py-3 px-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => updateQuantity(eq.id, -1)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <span>{eq.quantity}</span>
                    <button
                      onClick={() => updateQuantity(eq.id, 1)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                  </div>
                </td>
                <td className="text-right py-3 px-4">{eq.margin.toFixed(2)}%</td>
                <td className="text-right py-3 px-4">
                  {formatCurrency(eq.purchasePrice * eq.quantity * (1 + eq.margin / 100))}
                </td>
                <td className="text-right py-3 px-4">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => startEditing(eq.id)}
                      className="text-blue-600 hover:text-blue-700"
                      title="Modifier"
                    >
                      <Pencil className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => removeFromList(eq.id)}
                      className="text-red-600 hover:text-red-700"
                      title="Supprimer"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {equipmentList.length > 0 && (
            <tfoot>
              <tr className="border-t-2 font-bold">
                <td colSpan={4} className="py-4 px-4 text-right">
                  Mensualité totale :
                </td>
                <td colSpan={2} className="py-4 px-4 text-right text-blue-600">
                  {formatCurrency(totalMonthlyPayment)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {equipmentList.length > 0 && (
        <div className="mt-8 bg-gray-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Récapitulatif global</h3>
          <div className="grid gap-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Coefficient actuel :</span>
              <span className="font-semibold">{globalMarginAdjustment.currentCoef.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Nouveau coefficient :</span>
              <span className="font-semibold">{globalMarginAdjustment.newCoef.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Marge globale :</span>
              <span className="font-semibold">{globalMarginAdjustment.percentage.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Marge totale en euros :</span>
              <span className="font-semibold">
                {formatCurrency(globalMarginAdjustment.amount)}
              </span>
            </div>
            <div className="flex justify-between items-center text-lg font-bold text-blue-600">
              <span>Mensualité totale :</span>
              <span>{formatCurrency(globalMarginAdjustment.newMonthly)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentList;
