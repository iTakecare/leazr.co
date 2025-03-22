
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/utils/formatters";
import { Input } from "@/components/ui/input";
import { Equipment } from "@/types/equipment";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import CommissionDisplay from "@/components/ui/CommissionDisplay";

interface EquipmentListProps {
  equipmentList: Equipment[];
  editingId: string | null;
  startEditing: (id: string) => void;
  removeFromList: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  totalMonthlyPayment: number;
  globalMarginAdjustment: {
    amount: number;
    active: boolean;
    newCoef: number;
    marginDifference: number;
  };
  toggleAdaptMonthlyPayment: () => void;
  hideFinancialDetails?: boolean;
  hideCommissionDisplay?: boolean;
  ambassadorId?: string;
  commissionLevelId?: string;
}

const AmbassadorEquipmentList = ({
  equipmentList,
  editingId,
  startEditing,
  removeFromList,
  updateQuantity,
  totalMonthlyPayment,
  globalMarginAdjustment,
  toggleAdaptMonthlyPayment,
  hideFinancialDetails = false,
  hideCommissionDisplay = true, // Changé à true par défaut pour toujours cacher les commissions
  ambassadorId,
  commissionLevelId,
}: EquipmentListProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Équipements sélectionnés</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {equipmentList.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground">
              Aucun équipement ajouté pour le moment
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {equipmentList.map((item) => (
                <div
                  key={item.id}
                  className="border rounded-md p-4 relative group hover:border-primary transition-colors"
                >
                  <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => startEditing(item.id)}
                        disabled={!!editingId}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeFromList(item.id)}
                        disabled={!!editingId}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div>
                      <h3 className="font-medium">{item.title}</h3>
                      <div className="flex justify-between items-center mt-2">
                        <div className="mt-1">
                          <div className="text-sm text-muted-foreground mb-2">
                            Quantité
                          </div>
                          <div className="flex items-center">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                updateQuantity(
                                  item.id,
                                  parseInt(e.target.value, 10) || 1
                                )
                              }
                              className="w-16 h-8"
                              min={1}
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground mb-1">
                            Prix
                          </div>
                          <div className="font-semibold">
                            {formatCurrency(item.purchasePrice)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {!hideFinancialDetails && (
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">
                            Marge
                          </div>
                          <div className="font-semibold">
                            {formatPercentage(item.margin)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground mb-1">
                            Mensualité
                          </div>
                          <div className="font-semibold">
                            {formatCurrency(
                              (item.monthlyPayment || 0) * item.quantity
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {hideFinancialDetails && (
                      <div className="grid grid-cols-1 gap-4 mt-2">
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground mb-1">
                            Mensualité
                          </div>
                          <div className="font-semibold">
                            {formatCurrency(
                              (item.monthlyPayment || 0) * item.quantity
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <div className="text-base">Total mensuel</div>
                <div className="font-bold text-lg">
                  {formatCurrency(totalMonthlyPayment)}
                </div>
              </div>

              {!hideFinancialDetails && (
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="adapt-monthly"
                        checked={globalMarginAdjustment.active}
                        onCheckedChange={toggleAdaptMonthlyPayment}
                      />
                      <Label htmlFor="adapt-monthly">
                        Adapter la mensualité
                      </Label>
                    </div>
                    <div className="text-sm">
                      {globalMarginAdjustment.active
                        ? "Ajustement automatique activé"
                        : "Ajustement manuel"}
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-2">
                    <div className="text-sm text-muted-foreground">
                      Coefficient appliqué
                    </div>
                    <div className="font-semibold">
                      {globalMarginAdjustment.newCoef.toFixed(2)}
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-2">
                    <div className="text-sm text-muted-foreground">
                      Ajustement marge
                    </div>
                    <div className="font-semibold">
                      {formatCurrency(globalMarginAdjustment.marginDifference)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Commission Display - désactivé par défaut pour les ambassadeurs */}
            {(!hideCommissionDisplay && ambassadorId) && (
              <div className="mt-4 pt-4 border-t">
                <CommissionDisplay
                  ambassadorId={ambassadorId}
                  commissionLevelId={commissionLevelId}
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AmbassadorEquipmentList;
