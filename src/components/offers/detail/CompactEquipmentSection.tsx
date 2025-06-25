
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";

interface CompactEquipmentSectionProps {
  offer: any;
}

const CompactEquipmentSection: React.FC<CompactEquipmentSectionProps> = ({ offer }) => {
  let equipmentItems = [];
  
  // Essayer de parser les équipements depuis equipment_description
  if (offer.equipment_description) {
    try {
      equipmentItems = JSON.parse(offer.equipment_description);
    } catch (e) {
      // Si ce n'est pas du JSON, traiter comme du texte
      equipmentItems = [{
        title: "Équipement",
        description: offer.equipment_description,
        quantity: 1
      }];
    }
  }

  // Utiliser les équipements parsés depuis parsedEquipment si disponibles
  if (offer.parsedEquipment && offer.parsedEquipment.length > 0) {
    equipmentItems = offer.parsedEquipment;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="w-5 h-5" />
          Équipements
        </CardTitle>
      </CardHeader>
      <CardContent>
        {equipmentItems.length > 0 ? (
          <div className="space-y-4">
            {equipmentItems.map((item: any, index: number) => (
              <div key={index} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <h4 className="font-medium">{item.title || `Équipement ${index + 1}`}</h4>
                  {item.description && (
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  )}
                </div>
                
                <div className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-700">Quantité</p>
                      <p className="text-lg">{item.quantity || 1}</p>
                    </div>
                    
                    {item.purchasePrice && (
                      <div>
                        <p className="font-medium text-gray-700">Prix d'achat</p>
                        <p className="text-lg font-semibold text-blue-600">
                          {formatCurrency(item.purchasePrice)}
                        </p>
                      </div>
                    )}
                    
                    {item.monthlyPayment && (
                      <div>
                        <p className="font-medium text-gray-700">Mensualité</p>
                        <p className="text-lg font-semibold text-green-600">
                          {formatCurrency(item.monthlyPayment)}
                        </p>
                      </div>
                    )}
                    
                    {item.margin && (
                      <div>
                        <p className="font-medium text-gray-700">Marge</p>
                        <p className="text-lg font-semibold text-purple-600">
                          {formatCurrency(item.margin)}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {item.attributes && Object.keys(item.attributes).length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="font-medium text-gray-700 mb-2">Caractéristiques</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {Object.entries(item.attributes).map(([key, value]: [string, any]) => (
                          <div key={key} className="flex justify-between text-sm py-1">
                            <span className="text-gray-600">{key}:</span>
                            <span className="font-medium">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">Aucun équipement spécifié</p>
        )}
        
        {offer.remarks && (
          <div className="mt-6 pt-4 border-t">
            <p className="font-medium text-gray-700 mb-2">Remarques</p>
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{offer.remarks}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CompactEquipmentSection;
