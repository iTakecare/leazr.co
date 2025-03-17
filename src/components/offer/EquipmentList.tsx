
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Equipment, GlobalMarginAdjustment } from "@/types/equipment";
import { formatCurrency, formatPercentage } from "@/utils/formatters";
import { Trash2, Edit, Minus, Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface EquipmentListProps {
  equipmentList: Equipment[];
  editingId: string | null;
  startEditing: (id: string) => void;
  removeFromList: (id: string) => void;
  updateQuantity: (id: string, change: number) => void;
  totalMonthlyPayment: number;
  globalMarginAdjustment: GlobalMarginAdjustment;
  toggleAdaptMonthlyPayment: () => void;
  adaptMonthlySwitchLabel?: string;
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
  adaptMonthlySwitchLabel = "Adapter la mensualité au nouveau coefficient"
}) => {
  const totalAmount = equipmentList.reduce(
    (sum, eq) => sum + eq.purchasePrice * eq.quantity,
    0
  );

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Liste des équipements</h3>
          <span className="text-muted-foreground text-sm">
            {equipmentList.length} élément{equipmentList.length !== 1 ? "s" : ""}
          </span>
        </div>

        {equipmentList.length === 0 ? (
          <div className="text-center py-10 border rounded-md border-dashed">
            <p className="text-muted-foreground mb-2">
              Aucun équipement dans la liste
            </p>
            <p className="text-xs text-muted-foreground">
              Utilisez le formulaire ci-contre pour ajouter des équipements
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {equipmentList.map((eq) => (
              <div
                key={eq.id}
                className="flex flex-col md:flex-row md:items-center justify-between border rounded-md p-3 gap-2"
              >
                <div className="flex-1">
                  <p className="font-medium">{eq.title}</p>
                  <div className="flex flex-wrap gap-x-4 text-sm text-muted-foreground">
                    <span>
                      {formatCurrency(eq.purchasePrice)} x {eq.quantity}
                    </span>
                    <span>{formatPercentage(eq.margin)} de marge</span>
                    {eq.monthlyPayment ? (
                      <span className="text-blue-600">
                        {formatCurrency(eq.monthlyPayment)} / mois
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-1 self-end md:self-auto">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateQuantity(eq.id, -1)}
                    disabled={editingId !== null}
                    className="h-8 w-8"
                    title="Réduire la quantité"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center">{eq.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateQuantity(eq.id, 1)}
                    disabled={editingId !== null}
                    className="h-8 w-8"
                    title="Augmenter la quantité"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => startEditing(eq.id)}
                    disabled={editingId !== null}
                    className="h-8 w-8"
                    title="Modifier"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFromList(eq.id)}
                    disabled={editingId !== null}
                    className="h-8 w-8 text-destructive"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <div className="mt-6 border-t pt-4">
              <div className="space-y-3">
                <div className="flex justify-between text-muted-foreground">
                  <span>Total équipements :</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
                
                <div className="flex justify-between font-medium text-blue-600">
                  <span>Mensualité totale :</span>
                  <span>{formatCurrency(totalMonthlyPayment)}</span>
                </div>
                
                <div className="flex items-center space-x-2 pt-3">
                  <Switch 
                    id="adapt-monthly"
                    checked={globalMarginAdjustment.adaptMonthlyPayment}
                    onCheckedChange={toggleAdaptMonthlyPayment}
                  />
                  <Label htmlFor="adapt-monthly" className="text-sm">
                    {adaptMonthlySwitchLabel}
                  </Label>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EquipmentList;
