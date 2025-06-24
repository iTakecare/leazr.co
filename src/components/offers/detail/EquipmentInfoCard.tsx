
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Hash } from "lucide-react";

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

  // Function to format attributes display
  const formatAttributes = (attributes: any) => {
    if (!attributes || typeof attributes !== 'object') return '';
    
    const attrs = Object.entries(attributes)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    
    return attrs ? ` (${attrs})` : '';
  };

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
                <div className="font-medium text-lg mb-2">
                  {item.title}{formatAttributes(item.attributes)}
                  {item.quantity && item.quantity > 1 && (
                    <span className="ml-2 text-sm text-gray-600">
                      (Quantité: {item.quantity})
                    </span>
                  )}
                </div>
                
                {item.serialNumber && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    <span className="font-medium">N° de série:</span> {item.serialNumber}
                  </div>
                )}
                
                {/* Afficher les spécifications techniques si disponibles */}
                {item.specifications && Object.keys(item.specifications).length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm font-medium text-muted-foreground mb-1">Spécifications:</div>
                    <div className="text-sm space-y-1">
                      {Object.entries(item.specifications).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="font-medium">{key}:</span>
                          <span>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Afficher les attributs si disponibles et différents des spécifications */}
                {item.attributes && Object.keys(item.attributes).length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm font-medium text-muted-foreground mb-1">Configuration:</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(item.attributes).map(([key, value]) => (
                        <span 
                          key={key}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {key}: {String(value)}
                        </span>
                      ))}
                    </div>
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
