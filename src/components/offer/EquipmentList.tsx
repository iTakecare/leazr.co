
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPercentage } from "@/utils/formatters";
import { Trash2, Edit, Plus, Minus, List } from "lucide-react";
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
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center">
            <List className="h-4 w-4 mr-2 text-primary" />
            Liste des équipements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground text-sm">
            Aucun équipement ajouté
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center">
          <List className="h-4 w-4 mr-2 text-primary" />
          Liste des équipements
        </CardTitle>
        <CardDescription className="text-xs">
          {equipmentList.length} équipement{equipmentList.length > 1 ? 's' : ''} dans cette offre
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {equipmentList.map((equipment) => (
            <div 
              key={equipment.id}
              className={`p-3 rounded ${
                editingId === equipment.id 
                  ? 'bg-primary/5 border border-primary/20' 
                  : 'bg-muted/30'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-sm">{equipment.title}</h4>
                  <div className="mt-1 text-xs text-muted-foreground">
                    <div>Prix: {formatCurrency(equipment.purchasePrice)} | Marge: {formatPercentage(equipment.margin)}</div>
                    <div>Prix financé: {formatCurrency(equipment.purchasePrice * (1 + equipment.margin / 100))}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6" 
                      onClick={() => updateQuantity(equipment.id, -1)}
                      disabled={equipment.quantity <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm mx-1">{equipment.quantity}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6" 
                      onClick={() => updateQuantity(equipment.id, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="text-xs font-medium mt-1">
                    {formatCurrency(equipment.purchasePrice * equipment.quantity)}
                  </div>
                </div>
              </div>
              <div className="flex justify-between mt-2">
                <div className="text-xs">
                  <span className="text-muted-foreground">Mensualité: </span>
                  <span className="font-medium">
                    {formatCurrency(
                      (equipment.purchasePrice * (1 + equipment.margin / 100) * globalMarginAdjustment.newCoef / 100) * equipment.quantity
                    )}
                  </span>
                </div>
                <div className="flex space-x-1">
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
              </div>
            </div>
          ))}

          <div className="mt-4 p-3 rounded bg-primary/10 border border-primary/20">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm">Marge globale:</span>
              <span className="font-medium text-sm">{formatPercentage(globalMarginAdjustment.percentage)}</span>
            </div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm">Montant de la marge:</span>
              <span className="font-medium text-sm">{formatCurrency(globalMarginAdjustment.amount)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Mensualité totale:</span>
              <span className="font-bold text-lg text-primary">{formatCurrency(totalMonthlyPayment)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EquipmentList;
