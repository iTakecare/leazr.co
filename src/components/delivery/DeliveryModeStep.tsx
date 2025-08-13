import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Package, Scissors, Hash } from "lucide-react";
import { ContractEquipment } from "@/services/contractService";
import { DeliveryMode } from "@/types/contractDelivery";

interface DeliveryModeStepProps {
  equipment: ContractEquipment;
  mode: DeliveryMode;
  onModeChange: (mode: DeliveryMode) => void;
}

const DeliveryModeStep: React.FC<DeliveryModeStepProps> = ({
  equipment,
  mode,
  onModeChange
}) => {
  // Obtenir les numéros de série
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

  const serialNumbers = getSerialNumbers(equipment);
  const hasSerialNumbers = serialNumbers.length > 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Package className="h-12 w-12 mx-auto text-primary mb-4" />
        <h3 className="text-lg font-semibold mb-2">Mode de livraison</h3>
        <p className="text-muted-foreground">Comment souhaitez-vous configurer la livraison de cet équipement ?</p>
      </div>

      <Card className="p-4 bg-muted/20">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h4 className="font-medium">{equipment.title}</h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">Quantité: {equipment.quantity}</Badge>
              {hasSerialNumbers && (
                <Badge variant="outline">
                  {serialNumbers.length} numéro{serialNumbers.length > 1 ? 's' : ''} de série
                </Badge>
              )}
            </div>
          </div>
        </div>

        <RadioGroup value={mode} onValueChange={(value) => onModeChange(value as DeliveryMode)}>
          <div className="space-y-4">
            {/* Mode simple - toujours disponible */}
            <Card className={`p-4 cursor-pointer transition-colors ${mode === 'single' ? 'ring-2 ring-primary' : ''}`}>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="single" id="single" />
                <div className="flex-1">
                  <Label htmlFor="single" className="flex items-center gap-3 cursor-pointer">
                    <Package className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">Livraison unique</div>
                      <div className="text-sm text-muted-foreground">
                        Tout livrer à la même destination
                      </div>
                    </div>
                  </Label>
                </div>
              </div>
            </Card>

            {/* Mode division par quantité - disponible si quantité > 1 */}
            {equipment.quantity > 1 && (
              <Card className={`p-4 cursor-pointer transition-colors ${mode === 'split_quantity' ? 'ring-2 ring-primary' : ''}`}>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="split_quantity" id="split_quantity" />
                  <div className="flex-1">
                    <Label htmlFor="split_quantity" className="flex items-center gap-3 cursor-pointer">
                      <Scissors className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">Diviser par quantités</div>
                        <div className="text-sm text-muted-foreground">
                          Diviser les {equipment.quantity} unités vers différentes destinations
                        </div>
                      </div>
                    </Label>
                  </div>
                </div>
              </Card>
            )}

            {/* Mode par numéro de série - disponible si des numéros de série existent */}
            {hasSerialNumbers && (
              <Card className={`p-4 cursor-pointer transition-colors ${mode === 'individual_serial' ? 'ring-2 ring-primary' : ''}`}>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="individual_serial" id="individual_serial" />
                  <div className="flex-1">
                    <Label htmlFor="individual_serial" className="flex items-center gap-3 cursor-pointer">
                      <Hash className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">Par numéro de série</div>
                        <div className="text-sm text-muted-foreground">
                          Configurer individuellement chaque numéro de série
                        </div>
                      </div>
                    </Label>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </RadioGroup>
      </Card>
    </div>
  );
};

export default DeliveryModeStep;