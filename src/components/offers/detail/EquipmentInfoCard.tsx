
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

  // Function to format equipment title with attributes
  const formatEquipmentTitle = (item: any): string => {
    let title = item.title;
    
    // Gérer les attributs sous différents formats
    let attributes = {};
    
    // Si les attributs sont un array d'objets (nouveau format DB)
    if (item.attributes && Array.isArray(item.attributes)) {
      item.attributes.forEach(attr => {
        attributes[attr.key] = attr.value;
      });
    }
    // Si les attributs sont un objet (ancien format JSON)
    else if (item.attributes && typeof item.attributes === 'object') {
      attributes = item.attributes;
    }
    
    if (Object.keys(attributes).length > 0) {
      const attributesText = Object.entries(attributes)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      title += ` (${attributesText})`;
    }
    
    return title;
  };

  // Function to render attribute badges
  const renderAttributeBadges = (item: any) => {
    let attributes = {};
    
    // Gérer les attributs sous différents formats
    if (item.attributes && Array.isArray(item.attributes)) {
      item.attributes.forEach(attr => {
        attributes[attr.key] = attr.value;
      });
    } else if (item.attributes && typeof item.attributes === 'object') {
      attributes = item.attributes;
    }

    if (Object.keys(attributes).length === 0) {
      return null;
    }

    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {Object.entries(attributes).map(([key, value], index) => (
          <span 
            key={`${key}-${index}`}
            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
          >
            {key}: {String(value)}
          </span>
        ))}
      </div>
    );
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
                  {item.title}
                  {item.quantity && item.quantity > 1 && (
                    <span className="ml-2 text-sm text-gray-600">
                      (Quantité: {item.quantity})
                    </span>
                  )}
                </div>
                
                {/* Afficher les attributs comme des badges */}
                {renderAttributeBadges(item)}
                
                {item.serialNumber && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    <span className="font-medium">N° de série:</span> {item.serialNumber}
                  </div>
                )}
                
                {/* Afficher les spécifications techniques si disponibles */}
                {((item.specifications && Array.isArray(item.specifications) && item.specifications.length > 0) ||
                  (item.specifications && typeof item.specifications === 'object' && Object.keys(item.specifications).length > 0)) && (
                  <div className="mt-3">
                    <div className="text-sm font-medium text-muted-foreground mb-1">Spécifications:</div>
                    <div className="text-sm space-y-1">
                      {Array.isArray(item.specifications) ? 
                        item.specifications.map((spec, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span className="font-medium">{spec.key}:</span>
                            <span>{spec.value}</span>
                          </div>
                        )) :
                        Object.entries(item.specifications).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="font-medium">{key}:</span>
                            <span>{String(value)}</span>
                          </div>
                        ))
                      }
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
