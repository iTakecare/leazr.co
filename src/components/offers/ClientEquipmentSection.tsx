
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Hash, Euro } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";

interface ClientEquipmentSectionProps {
  offer: any;
}

const ClientEquipmentSection: React.FC<ClientEquipmentSectionProps> = ({ offer }) => {
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
    <Card className="mb-6 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
          <Package className="w-5 h-5 mr-2" />
          Équipements
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {equipmentItems.length > 0 ? (
          <div className="space-y-4 p-6">
            {equipmentItems.map((item: any, index: number) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-medium text-lg">{item.title || `Équipement ${index + 1}`}</h4>
                  {item.quantity && (
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Hash className="w-4 h-4" />
                      Qté: {item.quantity}
                    </div>
                  )}
                </div>
                
                {item.description && (
                  <p className="text-gray-600 mb-3">{item.description}</p>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {item.monthlyPayment && (
                    <div className="flex items-center gap-2">
                      <Euro className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-gray-500">Mensualité HT</p>
                        <p className="font-medium text-blue-700">{formatCurrency(item.monthlyPayment)}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {item.attributes && Object.keys(item.attributes).length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm font-medium text-gray-700 mb-2">Caractéristiques</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(item.attributes).map(([key, value]: [string, any]) => (
                        <div key={key} className="text-sm">
                          <span className="text-gray-500">{key}:</span>
                          <span className="ml-2 font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {item.specifications && Object.keys(item.specifications).length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm font-medium text-gray-700 mb-2">Spécifications</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(item.specifications).map(([key, value]: [string, any]) => (
                        <div key={key} className="text-sm">
                          <span className="text-gray-500">{key}:</span>
                          <span className="ml-2 font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 p-6">Aucun équipement spécifié</p>
        )}
        
        {offer.remarks && (
          <div className="border-t p-6 bg-amber-50">
            <p className="text-sm font-medium text-amber-800 mb-2">Remarques importantes</p>
            <p className="text-sm text-amber-700">{offer.remarks}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientEquipmentSection;
