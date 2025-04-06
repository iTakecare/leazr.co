import React, { useState, useEffect } from "react";
import { Equipment } from "@/types/equipment";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2Icon, PencilIcon } from "lucide-react";
import { calculateCommissionByLevel } from "@/utils/calculator";

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
}: {
  equipmentList: Equipment[];
  editingId: string | null;
  startEditing: (id: string) => void;
  removeFromList: (id: string) => void;
  updateQuantity: (id: string, newQuantity: number) => void;
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
}) => {
  const [commissionInfo, setCommissionInfo] = useState<{ amount: number; rate: number } | null>(null);

  useEffect(() => {
    const calculateCommission = async () => {
      if (!ambassadorId || !commissionLevelId || hideFinancialDetails) {
        setCommissionInfo(null);
        return;
      }

      try {
        const commissionData = await calculateCommissionByLevel(
          totalMonthlyPayment * globalMarginAdjustment.newCoef,
          commissionLevelId,
          'ambassador',
          ambassadorId
        );

        if (commissionData) {
          setCommissionInfo({
            amount: commissionData.amount,
            rate: commissionData.rate
          });
        } else {
          setCommissionInfo(null);
        }
      } catch (error) {
        console.error("Erreur lors du calcul de la commission:", error);
        setCommissionInfo(null);
      }
    };

    calculateCommission();
  }, [totalMonthlyPayment, globalMarginAdjustment.newCoef, ambassadorId, commissionLevelId, hideFinancialDetails]);
  
  const renderCommissionInfo = () => {
    if (hideFinancialDetails || !ambassadorId || !commissionLevelId) return null;

    let commissionContent;
    
    if (commissionInfo) {
      commissionContent = (
        <div className="flex items-center space-x-1">
          <span data-commission-value={`${commissionInfo.amount}`}>{commissionInfo.amount}€</span>
          <span className="text-xs text-gray-500">({commissionInfo.rate}%)</span>
        </div>
      );
    } else {
      const estimatedCommission = Math.round(totalMonthlyPayment * 0.25);
      commissionContent = (
        <div className="flex items-center space-x-1">
          <span data-commission-value={`${estimatedCommission}`}>{estimatedCommission}€</span>
          <span className="text-xs text-gray-500">(~25%)</span>
        </div>
      );
    }

    return (
      <div className="mt-4 p-4 border rounded-lg bg-green-50 border-green-200">
        <div className="flex justify-between items-center">
          <div className="text-green-800 font-medium">Votre commission :</div>
          <div className="text-green-800 font-bold">{commissionContent}</div>
        </div>
      </div>
    );
  };

  const formatEquipmentDisplay = () => {
    return equipmentList.map(eq => 
      `${eq.title} - Quantité: ${eq.quantity}`
    ).join('\n');
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Liste des équipements</h2>
      {equipmentList.length === 0 ? (
        <p>Aucun équipement ajouté pour le moment.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Équipement
                </th>
                {!hideFinancialDetails && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prix d'achat
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantité
                </th>
                {!hideFinancialDetails && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Marge
                  </th>
                )}
                {!hideFinancialDetails && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mensualité
                  </th>
                )}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {equipmentList.map((eq) => (
                <tr key={eq.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{eq.title}</td>
                  {!hideFinancialDetails && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{eq.purchasePrice}€</td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <Input
                      type="number"
                      min="1"
                      value={eq.quantity}
                      onChange={(e) => {
                        const newQuantity = parseInt(e.target.value, 10);
                        if (!isNaN(newQuantity)) {
                          updateQuantity(eq.id, newQuantity);
                        }
                      }}
                      className="w-20"
                    />
                  </td>
                  {!hideFinancialDetails && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{eq.margin}%</td>
                  )}
                  {!hideFinancialDetails && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{eq.monthlyPayment?.toFixed(2)}€</td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button variant="ghost" onClick={() => startEditing(eq.id)}>
                      <PencilIcon className="h-4 w-4 mr-2" />
                      Modifier
                    </Button>
                    <Button variant="ghost" onClick={() => removeFromList(eq.id)}>
                      <Trash2Icon className="h-4 w-4 mr-2" />
                      Supprimer
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!hideFinancialDetails && (
        <div className="mt-4 p-4 border rounded-lg bg-blue-50 border-blue-200">
          <div className="flex justify-between items-center">
            <div className="text-blue-800 font-medium">Total Mensualités :</div>
            <div className="text-blue-800 font-bold">{totalMonthlyPayment.toFixed(2)}€</div>
          </div>
        </div>
      )}

      {!hideFinancialDetails && (
        <div className="mt-4 p-4 border rounded-lg bg-yellow-50 border-yellow-200">
          <div className="flex justify-between items-center">
            <div className="text-yellow-800 font-medium">Marge Totale :</div>
            <div className="text-yellow-800 font-bold">{globalMarginAdjustment.amount.toFixed(2)}€</div>
          </div>
          <div className="flex justify-between items-center mt-2">
            <div className="text-yellow-800 font-medium">Nouveau Coefficient :</div>
            <div className="text-yellow-800 font-bold">{globalMarginAdjustment.newCoef.toFixed(2)}</div>
          </div>
          <div className="flex items-center mt-2">
            <label htmlFor="adaptMonthlyPayment" className="mr-2 text-yellow-800 font-medium">
              Adapter la mensualité :
            </label>
            <input
              type="checkbox"
              id="adaptMonthlyPayment"
              checked={globalMarginAdjustment.active}
              onChange={toggleAdaptMonthlyPayment}
              className="form-checkbox h-5 w-5 text-yellow-600 rounded"
            />
          </div>
          {globalMarginAdjustment.marginDifference !== 0 && (
            <div className="mt-2">
              <div className="text-yellow-700 text-sm">
                Différence de marge : {globalMarginAdjustment.marginDifference.toFixed(2)}€
              </div>
            </div>
          )}
        </div>
      )}
      {renderCommissionInfo()}
    </div>
  );
};

export default EquipmentList;
