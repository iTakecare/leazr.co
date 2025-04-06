import React from "react";
import { Equipment } from "@/types/equipment";
import { formatCurrency } from "@/utils/formatters";
import { Switch } from "@/components/ui/switch";

interface EquipmentListProps {
  equipmentList: Equipment[];
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
  commissionLevelId?: string | null;
  commissionAmount?: number;
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
  commissionAmount = 0,
}: EquipmentListProps) => {
  return (
    <div className="bg-white rounded-lg border">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-lg">
          Liste des équipements
        </h3>
      </div>
      
      <div>
        {equipmentList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Équipement
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prix
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantité
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Marge
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mensualité
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-gray-200">
                {equipmentList.map((eq) => (
                  <tr key={eq.id}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {eq.title}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatCurrency(eq.purchasePrice)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="number"
                        value={eq.quantity}
                        onChange={(e) => updateQuantity(eq.id, parseInt(e.target.value))}
                        className="w-20 border rounded-md px-2 py-1"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {eq.margin}%
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatCurrency(eq.monthlyPayment || 0)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      {editingId === eq.id ? (
                        <button
                          onClick={cancelEditing}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Annuler
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditing(eq.id)}
                            className="text-blue-600 hover:text-blue-800 mr-2"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => removeFromList(eq.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Supprimer
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            Aucun équipement n'a été ajouté
          </div>
        )}
      </div>
      
      {equipmentList.length > 0 && (
        <div className="p-4 border-t">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm text-gray-600">Adapter la mensualité au nouveau coefficient</div>
            <Switch
              checked={globalMarginAdjustment.active}
              onCheckedChange={toggleAdaptMonthlyPayment}
            />
          </div>
          
          <div className="mt-4 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Mensualité totale :</span>
              <span className="font-semibold text-xl">
                {formatCurrency(totalMonthlyPayment)}
              </span>
            </div>
            
            {ambassadorId && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Votre commission :</span>
                <span className="font-semibold text-xl text-green-600">
                  {formatCurrency(commissionAmount)}
                </span>
              </div>
            )}
            
            {!hideFinancialDetails && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Coefficient :</span>
                  <span>{globalMarginAdjustment.newCoef.toFixed(2)}%</span>
                </div>
                {globalMarginAdjustment.marginDifference !== 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Ajustement de la marge :</span>
                    <span>{formatCurrency(globalMarginAdjustment.marginDifference)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentList;
