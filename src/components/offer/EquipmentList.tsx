import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit2, Package, TrendingUp } from "lucide-react";
import { Equipment, GlobalMarginAdjustment } from "@/types/equipment";
import { formatCurrency } from "@/utils/formatters";
import { Switch } from "@/components/ui/switch";
import SimpleCommissionDisplay from "@/components/ambassador/SimpleCommissionDisplay";
import { useCommissionCalculator } from "@/utils/commission";

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
  commissionLevelId?: string;
}

const EquipmentList: React.FC<EquipmentListProps> = ({
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
}) => {
  const totalPurchasePrice = equipmentList.reduce(
    (sum, eq) => sum + eq.purchasePrice * eq.quantity,
    0
  );

  const handleQuantityChange = (id: string, newQuantity: number) => {
    if (newQuantity >= 1) {
      updateQuantity(id, newQuantity);
    }
  };

  const commission = useCommissionCalculator(
    totalMonthlyPayment,
    ambassadorId,
    commissionLevelId,
    equipmentList.length
  );

  console.log("EquipmentList - Commission calculation debug:", {
    ambassadorId,
    commissionLevelId,
    totalMonthlyPayment,
    equipmentListLength: equipmentList.length,
    commission
  });

  // Debug logging pour diagnostiquer les props
  console.log("EquipmentList debug:", {
    totalMonthlyPayment,
    equipmentListLength: equipmentList.length,
    ambassadorId,
    commissionLevelId,
    hideFinancialDetails
  });

  return (
    <div className="space-y-6">
      {/* Liste des équipements */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <CardTitle className="text-base">Liste des équipements</CardTitle>
          </div>
          {equipmentList.length > 0 && (
            <Badge variant="secondary">{equipmentList.length} équipement(s)</Badge>
          )}
        </CardHeader>
        <CardContent>
          {equipmentList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun équipement ajouté</p>
              <p className="text-sm">Ajoutez des équipements pour calculer votre offre</p>
            </div>
          ) : (
            <div className="space-y-3">
              {equipmentList.map((eq) => (
                <div
                  key={eq.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border rounded-lg ${
                    editingId === eq.id ? "border-blue-500 bg-blue-50" : "border-gray-200"
                  }`}
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{eq.title}</h4>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-1">
                      {!hideFinancialDetails && (
                        <>
                          <span>Prix: {formatCurrency(eq.purchasePrice)}</span>
                          <span>Marge: {eq.margin}%</span>
                        </>
                      )}
                      <span>Mensualité: {formatCurrency(eq.monthlyPayment || 0)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Qté:</label>
                      <div className="flex items-center border rounded">
                        <button
                          onClick={() => handleQuantityChange(eq.id, eq.quantity - 1)}
                          className="px-2 py-1 text-sm hover:bg-gray-100"
                          disabled={eq.quantity <= 1}
                        >
                          -
                        </button>
                        <span className="px-3 py-1 text-sm border-x">{eq.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(eq.id, eq.quantity + 1)}
                          className="px-2 py-1 text-sm hover:bg-gray-100"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(eq.id)}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeFromList(eq.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Récapitulatif des totaux */}
      {equipmentList.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
            <TrendingUp className="h-4 w-4" />
            <CardTitle className="text-base">Récapitulatif</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!hideFinancialDetails && (
              <>
                <div className="flex justify-between py-2">
                  <span className="text-sm text-gray-600">Prix d'achat total:</span>
                  <span className="font-medium">{formatCurrency(totalPurchasePrice)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm text-gray-600">Marge générée:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(globalMarginAdjustment.amount)}
                  </span>
                </div>
                {globalMarginAdjustment.marginDifference !== 0 && (
                  <div className="flex justify-between py-2">
                    <span className="text-sm text-gray-600">Ajustement marge:</span>
                    <span className={`font-medium ${globalMarginAdjustment.marginDifference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {globalMarginAdjustment.marginDifference > 0 ? '+' : ''}{formatCurrency(globalMarginAdjustment.marginDifference)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-t">
                  <span className="text-sm text-gray-600">Coefficient:</span>
                  <span className="font-medium">{globalMarginAdjustment.newCoef.toFixed(2)}</span>
                </div>
              </>
            )}
            
            <div className="flex justify-between py-2 border-t">
              <span className="font-medium">Mensualité totale:</span>
              <span className="font-bold text-lg text-blue-600">
                {formatCurrency(totalMonthlyPayment)}
              </span>
            </div>

            {!hideFinancialDetails && (
              <div className="flex items-center justify-between py-2 border rounded-lg px-3">
                <div>
                  <span className="text-sm font-medium">Adapter automatiquement la mensualité</span>
                  <p className="text-xs text-gray-500">
                    Ajuste la mensualité selon le coefficient optimal
                  </p>
                </div>
                <Switch
                  checked={globalMarginAdjustment.active}
                  onCheckedChange={toggleAdaptMonthlyPayment}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Commission d'ambassadeur - Affichage conditionnel amélioré */}
      {totalMonthlyPayment > 0 && equipmentList.length > 0 && (
        <SimpleCommissionDisplay
          totalMonthlyPayment={totalMonthlyPayment}
          ambassadorId={ambassadorId}
          equipmentListLength={equipmentList.length}
        />
      )}
    </div>
  );
};

export default EquipmentList;
