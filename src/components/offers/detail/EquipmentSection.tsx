
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Hash, Euro } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { calculateEquipmentTotals, calculateOfferMargin } from "@/utils/marginCalculations";

interface EquipmentSectionProps {
  offer: any;
}

const EquipmentSection: React.FC<EquipmentSectionProps> = ({ offer }) => {
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
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Équipements
        </CardTitle>
      </CardHeader>
      <CardContent>
        {equipmentItems.length > 0 ? (
          <div className="space-y-4">
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
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {item.purchasePrice && (
                    <div className="flex items-center gap-2">
                      <Euro className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-gray-500">Prix d'achat</p>
                        <p className="font-medium">{formatCurrency(item.purchasePrice)}</p>
                      </div>
                    </div>
                  )}
                  
                  {item.monthlyPayment && (
                    <div className="flex items-center gap-2">
                      <Euro className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-gray-500">Mensualité</p>
                        <p className="font-medium">{formatCurrency(item.monthlyPayment)}</p>
                      </div>
                    </div>
                  )}
                  
                  {item.margin && (
                    <div className="flex items-center gap-2">
                      <Euro className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-gray-500">Marge</p>
                        <p className="font-medium">{formatCurrency(item.margin)}</p>
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
          <p className="text-gray-500">Aucun équipement spécifié</p>
        )}

        {/* Afficher le total si on a des équipements */}
        {equipmentItems.length > 0 && (() => {
          const totals = calculateEquipmentTotals(offer);
          const calculatedMargin = calculateOfferMargin(offer);
          
          return (
            <div className="mt-6 pt-4 border-t bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="font-medium">
                  <p className="text-gray-500 mb-1">Total articles</p>
                  <p className="text-lg font-bold">{equipmentItems.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)}</p>
                </div>
                <div className="font-medium">
                  <p className="text-gray-500 mb-1">Prix d'achat total</p>
                  <p className="text-lg font-bold text-blue-600">
                    {formatCurrency(totals.totalPurchasePrice)}
                  </p>
                </div>
                <div className="font-medium">
                  <p className="text-gray-500 mb-1">Mensualité totale</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(totals.totalMonthlyPayment)}
                  </p>
                </div>
                <div className="font-medium">
                  <p className="text-gray-500 mb-1">Marge totale</p>
                  <p className="text-lg font-bold text-purple-600">
                    {formatCurrency(calculatedMargin || 0)}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}
        
        {offer.remarks && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium text-gray-700 mb-2">Remarques</p>
            <p className="text-sm text-gray-600">{offer.remarks}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EquipmentSection;
