import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Hash } from "lucide-react";
import { ContractEquipment } from "@/services/contractService";
import { EquipmentDeliveryItem } from "@/types/contractDelivery";
import { toast } from "sonner";

interface SerialNumberAssignmentStepProps {
  equipment: ContractEquipment;
  deliveryItems: EquipmentDeliveryItem[];
  onDeliveryItemsChange: (items: EquipmentDeliveryItem[]) => void;
}

const SerialNumberAssignmentStep: React.FC<SerialNumberAssignmentStepProps> = ({
  equipment,
  deliveryItems,
  onDeliveryItemsChange
}) => {
  const [items, setItems] = useState<EquipmentDeliveryItem[]>(deliveryItems);

  // Obtenir les numéros de série de l'équipement
  const getSerialNumbers = (item: ContractEquipment): string[] => {
    if (!item.serial_number) return [];
    
    try {
      if (typeof item.serial_number === 'string') {
        const parsed = JSON.parse(item.serial_number);
        if (Array.isArray(parsed)) {
          return parsed.filter(sn => sn && sn.trim());
        }
      }
      return [];
    } catch {
      return [];
    }
  };

  const allSerialNumbers = getSerialNumbers(equipment);
  const getAssignedSerials = () => items.flatMap(item => item.serialNumbers);
  const getUnassignedSerials = () => 
    allSerialNumbers.filter(sn => !getAssignedSerials().includes(sn));

  useEffect(() => {
    // Initialiser avec un item par numéro de série si vide
    if (items.length === 0 && allSerialNumbers.length > 0) {
      const initialItems: EquipmentDeliveryItem[] = allSerialNumbers.map(serialNumber => ({
        quantity: 1,
        serialNumbers: [serialNumber],
        deliveryType: 'main_client',
        deliveryCountry: 'BE'
      }));
      setItems(initialItems);
      onDeliveryItemsChange(initialItems);
    }
  }, [allSerialNumbers.length]);

  const updateItem = (index: number, updates: Partial<EquipmentDeliveryItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    
    // Calculer automatiquement la quantité basée sur les numéros de série
    if (updates.serialNumbers) {
      newItems[index].quantity = updates.serialNumbers.length;
    }
    
    setItems(newItems);
    onDeliveryItemsChange(newItems);
  };

  const addItem = () => {
    const unassigned = getUnassignedSerials();
    if (unassigned.length === 0) {
      toast.error("Tous les numéros de série sont déjà assignés");
      return;
    }

    const newItem: EquipmentDeliveryItem = {
      quantity: 0,
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

  const updateSerialNumbers = (index: number, serialsText: string) => {
    const serials = serialsText
      .split(/[\n,;]/)
      .map(s => s.trim())
      .filter(s => s && allSerialNumbers.includes(s));
    
    updateItem(index, { serialNumbers: serials });
  };

  const assignSerialToItem = (index: number, serial: string) => {
    const currentSerials = items[index].serialNumbers;
    if (!currentSerials.includes(serial)) {
      updateItem(index, { 
        serialNumbers: [...currentSerials, serial]
      });
    }
  };

  const removeSerialFromItem = (index: number, serial: string) => {
    const currentSerials = items[index].serialNumbers;
    updateItem(index, { 
      serialNumbers: currentSerials.filter(s => s !== serial)
    });
  };

  const assignedCount = getAssignedSerials().length;
  const isComplete = assignedCount === allSerialNumbers.length;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Hash className="h-12 w-12 mx-auto text-primary mb-4" />
        <h3 className="text-lg font-semibold mb-2">Attribution par numéro de série</h3>
        <p className="text-muted-foreground">
          Assignez individuellement chaque numéro de série à une livraison
        </p>
      </div>

      <Card className="p-4 bg-muted/20">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium">{equipment.title}</h4>
          <div className="flex items-center gap-2">
            <Badge variant={isComplete ? "default" : "destructive"}>
              {assignedCount}/{allSerialNumbers.length} assignés
            </Badge>
          </div>
        </div>
        
        {getUnassignedSerials().length > 0 && (
          <div className="mt-4">
            <h5 className="text-sm font-medium mb-2">Numéros non assignés :</h5>
            <div className="flex flex-wrap gap-2">
              {getUnassignedSerials().map(serial => (
                <Badge key={serial} variant="outline" className="text-xs">
                  {serial}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Card>

      <div className="space-y-4">
        {items.map((item, index) => (
          <Card key={index} className="p-4">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Livraison {index + 1}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {item.serialNumbers.length} N° série
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                    disabled={items.length <= 1}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-4">
                <div>
                  <Label htmlFor={`serials_${index}`}>Numéros de série</Label>
                  <Textarea
                    id={`serials_${index}`}
                    value={item.serialNumbers.join('\n')}
                    onChange={(e) => updateSerialNumbers(index, e.target.value)}
                    placeholder="Saisissez les numéros de série (un par ligne)"
                    rows={3}
                    className="mt-1"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Séparez par des retours à la ligne, virgules ou points-virgules
                  </div>
                </div>

                {/* Boutons d'assignation rapide */}
                {getUnassignedSerials().length > 0 && (
                  <div>
                    <Label className="text-sm">Attribution rapide :</Label>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {getUnassignedSerials().slice(0, 10).map(serial => (
                        <Button
                          key={serial}
                          variant="outline"
                          size="sm"
                          onClick={() => assignSerialToItem(index, serial)}
                          className="h-7 px-2 text-xs"
                        >
                          {serial}
                        </Button>
                      ))}
                      {getUnassignedSerials().length > 10 && (
                        <Badge variant="outline" className="text-xs">
                          +{getUnassignedSerials().length - 10} autres
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Affichage des numéros assignés à cet item */}
                {item.serialNumbers.length > 0 && (
                  <div>
                    <Label className="text-sm">Assignés à cette livraison :</Label>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.serialNumbers.map(serial => (
                        <Badge 
                          key={serial} 
                          variant="default" 
                          className="text-xs cursor-pointer"
                          onClick={() => removeSerialFromItem(index, serial)}
                        >
                          {serial} ×
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor={`notes_${index}`}>Notes (optionnel)</Label>
                  <Textarea
                    id={`notes_${index}`}
                    value={item.notes || ''}
                    onChange={(e) => updateItem(index, { notes: e.target.value })}
                    placeholder="Notes pour cette livraison..."
                    rows={2}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        variant="outline"
        onClick={addItem}
        className="w-full"
        disabled={getUnassignedSerials().length === 0}
      >
        <Plus className="h-4 w-4 mr-2" />
        Ajouter une livraison
      </Button>

      {!isComplete && (
        <Card className="p-4 bg-destructive/10 border-destructive/20">
          <div className="text-sm text-destructive">
            <strong>Attention :</strong> {getUnassignedSerials().length} numéro(s) de série non assigné(s).
            Tous les numéros de série doivent être assignés à une livraison.
          </div>
        </Card>
      )}
    </div>
  );
};

export default SerialNumberAssignmentStep;