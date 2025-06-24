
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Hash, Euro } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";

interface EquipmentInfoCardProps {
  equipmentDescription: string;
  equipmentItems?: any[];
}

const EquipmentInfoCard: React.FC<EquipmentInfoCardProps> = ({
  equipmentDescription,
  equipmentItems = []
}) => {
  // Essayer de parser l'equipment_description si c'est du JSON
  let parsedEquipment = equipmentItems;
  if (!parsedEquipment.length && equipmentDescription) {
    try {
      if (equipmentDescription.startsWith('[') && equipmentDescription.endsWith(']')) {
        parsedEquipment = JSON.parse(equipmentDescription);
      }
    } catch (e) {
      // Si parsing échoue, on garde la description textuelle
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="h-5 w-5 text-green-600" />
          Équipements
        </CardTitle>
      </CardHeader>
      <CardContent>
        {parsedEquipment.length > 0 ? (
          <div className="space-y-4">
            {parsedEquipment.map((item, index) => (
              <div key={item.id || index} className="border rounded-lg p-4 bg-gray-50">
                <div className="font-medium text-lg mb-2">{item.title}</div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Euro className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{formatCurrency(item.purchasePrice || 0)}</div>
                      <div className="text-muted-foreground">Prix d'achat</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{item.quantity || 1}</div>
                      <div className="text-muted-foreground">Quantité</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-green-100 text-green-600 text-xs flex items-center justify-center font-bold">%</div>
                    <div>
                      <div className="font-medium">{item.margin || 0}%</div>
                      <div className="text-muted-foreground">Marge</div>
                    </div>
                  </div>
                </div>
                
                {item.serialNumber && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    <span className="font-medium">N° de série:</span> {item.serialNumber}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground whitespace-pre-wrap">
            {equipmentDescription || "Aucune description d'équipement disponible"}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EquipmentInfoCard;
