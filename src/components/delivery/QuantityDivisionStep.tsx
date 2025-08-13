import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Package } from "lucide-react";
import { ContractEquipment } from "@/services/contractService";
import { EquipmentDeliveryItem } from "@/types/contractDelivery";
import { toast } from "sonner";

interface QuantityDivisionStepProps {
  equipment: ContractEquipment;
  deliveryItems: EquipmentDeliveryItem[];
  onDeliveryItemsChange: (items: EquipmentDeliveryItem[]) => void;
}

const QuantityDivisionStep: React.FC<QuantityDivisionStepProps> = ({
  equipment,
  deliveryItems,
  onDeliveryItemsChange
}) => {
  const [items, setItems] = useState<EquipmentDeliveryItem[]>(deliveryItems);

  useEffect(() => {
    // Initialiser avec au moins 2 items si vide
    if (items.length === 0) {
      const initialItems: EquipmentDeliveryItem[] = [
        {
          quantity: Math.floor(equipment.quantity / 2),
          serialNumbers: [],
          deliveryType: 'main_client',
          deliveryCountry: 'BE'
        },
        {
          quantity: equipment.quantity - Math.floor(equipment.quantity / 2),
          serialNumbers: [],
          deliveryType: 'main_client',
          deliveryCountry: 'BE'
        }
      ];
      setItems(initialItems);
      onDeliveryItemsChange(initialItems);
    }
  }, []);

  const getTotalQuantity = () => items.reduce((sum, item) => sum + item.quantity, 0);
  const getRemainingQuantity = () => equipment.quantity - getTotalQuantity();

  const updateItem = (index: number, updates: Partial<EquipmentDeliveryItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    setItems(newItems);
    onDeliveryItemsChange(newItems);
  };

  const addItem = () => {
    const remaining = getRemainingQuantity();
    if (remaining <= 0) {
      toast.error("Toutes les quantités sont déjà attribuées");
      return;
    }

    const newItem: EquipmentDeliveryItem = {
      quantity: Math.min(1, remaining),
      serialNumbers: [],
      deliveryType: 'main_client',
      deliveryCountry: 'BE'
    };

    const newItems = [...items, newItem];
    setItems(newItems);
    onDeliveryItemsChange(newItems);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      toast.error("Au moins une livraison est requise");
      return;
    }

    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    onDeliveryItemsChange(newItems);
  };

  const totalQuantity = getTotalQuantity();
  const isValid = totalQuantity === equipment.quantity;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Package className="h-12 w-12 mx-auto text-primary mb-4" />
        <h3 className="text-lg font-semibold mb-2">Division par quantités</h3>
        <p className="text-muted-foreground">
          Divisez les {equipment.quantity} unités de "{equipment.title}" en plusieurs livraisons
        </p>
      </div>

      <Card className="p-4 bg-muted/20">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium">{equipment.title}</h4>
          <div className="flex items-center gap-2">
            <Badge variant={isValid ? "default" : "destructive"}>
              {totalQuantity}/{equipment.quantity} unités
            </Badge>
            {getRemainingQuantity() > 0 && (
              <Badge variant="outline">
                {getRemainingQuantity()} restantes
              </Badge>
            )}
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {items.map((item, index) => (
          <Card key={index} className="p-4">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Livraison {index + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(index)}
                  disabled={items.length <= 1}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-3">
                <div>
                  <Label htmlFor={`quantity_${index}`}>Quantité</Label>
                  <Input
                    id={`quantity_${index}`}
                    type="number"
                    min="1"
                    max={item.quantity + getRemainingQuantity()}
                    value={item.quantity}
                    onChange={(e) => updateItem(index, { 
                      quantity: Math.max(1, parseInt(e.target.value) || 0) 
                    })}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor={`notes_${index}`}>Notes (optionnel)</Label>
                  <Input
                    id={`notes_${index}`}
                    value={item.notes || ''}
                    onChange={(e) => updateItem(index, { notes: e.target.value })}
                    placeholder="Notes pour cette livraison..."
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {getRemainingQuantity() > 0 && (
        <Button
          variant="outline"
          onClick={addItem}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une livraison ({getRemainingQuantity()} disponibles)
        </Button>
      )}

      {!isValid && (
        <Card className="p-4 bg-destructive/10 border-destructive/20">
          <div className="text-sm text-destructive">
            <strong>Attention :</strong> Le total des quantités ({totalQuantity}) doit être égal à la quantité d'équipement ({equipment.quantity}).
            {getRemainingQuantity() > 0 ? ` Il reste ${getRemainingQuantity()} unité(s) à attribuer.` : ` Vous avez ${Math.abs(getRemainingQuantity())} unité(s) en trop.`}
          </div>
        </Card>
      )}
    </div>
  );
};

export default QuantityDivisionStep;