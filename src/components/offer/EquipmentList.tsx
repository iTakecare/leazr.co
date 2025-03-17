
import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Equipment } from "@/types/equipment";
import {
  Edit,
  Trash2,
  MoveUp,
  MoveDown,
  Plus,
  Minus,
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters";

interface EquipmentListProps {
  equipmentList: Equipment[];
  editingId: string | null;
  startEditing: (id: string) => void;
  removeFromList: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  totalMonthlyPayment: number;
  globalMarginAdjustment: {
    enabled: boolean;
    amount: number;
    originalAmount: number;
    newCoef: number;
    originalCoef: number;
    newMonthly: number;
    originalMonthly: number;
  };
  toggleAdaptMonthlyPayment: () => void;
  hideMarginInfo?: boolean;
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
  hideMarginInfo = false,
}) => {
  if (equipmentList.length === 0) {
    return (
      <Card className="shadow-sm border-gray-200 rounded-lg">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg font-medium">Équipements</CardTitle>
          <CardDescription>Aucun équipement ajouté</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8 text-muted-foreground">
            <p>Commencez par ajouter un équipement à l'offre</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate total monthly payment
  const subtotal = equipmentList.reduce(
    (sum, item) => {
      const itemTotalPrice = item.purchasePrice * item.quantity;
      const itemMarginAmount = (itemTotalPrice * item.margin) / 100;
      return {
        price: sum.price + itemTotalPrice,
        margin: sum.margin + itemMarginAmount,
      };
    },
    { price: 0, margin: 0 }
  );

  const totalPrice = subtotal.price + subtotal.margin;
  
  // Sort equipment by title
  const sortedEquipment = [...equipmentList].sort((a, b) => 
    a.title.localeCompare(b.title)
  );

  return (
    <Card className="shadow-sm border-gray-200 rounded-lg">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg font-medium">Équipements</CardTitle>
        <CardDescription>
          {equipmentList.length} équipement{equipmentList.length > 1 ? "s" : ""} dans l'offre
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right w-20">Qté</TableHead>
                {!hideMarginInfo && (
                  <>
                    <TableHead className="text-right">Prix unitaire</TableHead>
                    <TableHead className="text-right">Marge</TableHead>
                  </>
                )}
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedEquipment.map((item) => {
                const itemTotalPrice = item.purchasePrice * item.quantity;
                const marginAmount = (itemTotalPrice * item.margin) / 100;
                const itemWithMargin = itemTotalPrice + marginAmount;

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 rounded-r-none border-r-0"
                          onClick={() =>
                            updateQuantity(
                              item.id,
                              Math.max(1, item.quantity - 1)
                            )
                          }
                          disabled={item.quantity <= 1 || editingId !== null}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <div className="w-8 text-center">{item.quantity}</div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 rounded-l-none border-l-0"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          disabled={editingId !== null}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    {!hideMarginInfo && (
                      <>
                        <TableCell className="text-right">
                          {formatCurrency(item.purchasePrice)}
                        </TableCell>
                        <TableCell className="text-right">{item.margin}%</TableCell>
                      </>
                    )}
                    <TableCell className="text-right">
                      {formatCurrency(
                        hideMarginInfo ? itemTotalPrice : itemWithMargin
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {!hideMarginInfo && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => startEditing(item.id)}
                            disabled={editingId !== null}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeFromList(item.id)}
                          disabled={editingId !== null}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="p-4 border-t">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="font-medium">Montant total:</span>
              <span>{formatCurrency(totalPrice)}</span>
            </div>
            {!hideMarginInfo && (
              <div className="flex justify-between text-gray-500 text-sm">
                <span>Matériel:</span>
                <span>{formatCurrency(subtotal.price)}</span>
              </div>
            )}
            {!hideMarginInfo && (
              <div className="flex justify-between text-gray-500 text-sm">
                <span>Marge:</span>
                <span>{formatCurrency(subtotal.margin)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-blue-600 text-lg border-t pt-2">
              <span>Mensualité:</span>
              <span>{formatCurrency(totalMonthlyPayment)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EquipmentList;
