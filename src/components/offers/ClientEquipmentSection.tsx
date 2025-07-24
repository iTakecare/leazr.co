
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Hash, Euro } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { useOfferEquipment } from "@/hooks/useOfferEquipment";

interface ClientEquipmentSectionProps {
  offer: any;
}

const ClientEquipmentSection: React.FC<ClientEquipmentSectionProps> = ({ offer }) => {
  const { equipment: offerEquipment, loading } = useOfferEquipment(offer.id);
  let equipmentItems = [];
  
  // Utiliser d'abord les données du hook useOfferEquipment si disponibles
  if (offerEquipment && offerEquipment.length > 0) {
    equipmentItems = offerEquipment.map(item => ({
      title: item.title,
      quantity: item.quantity,
      monthlyPayment: item.monthly_payment,
      attributes: item.attributes ? Object.fromEntries(item.attributes.map(attr => [attr.key, attr.value])) : {}
    }));
  } else {
    // Fallback : essayer de parser les équipements depuis equipment_description
    if (offer.equipment_description) {
      try {
        equipmentItems = JSON.parse(offer.equipment_description);
      } catch (e) {
        // Si ce n'est pas du JSON, traiter comme du texte
        equipmentItems = [{
          title: "Équipement",
          description: offer.equipment_description,
          quantity: 1,
          monthlyPayment: offer.monthly_payment || 0
        }];
      }
    }

    // Utiliser les équipements parsés depuis parsedEquipment si disponibles
    if (offer.parsedEquipment && offer.parsedEquipment.length > 0) {
      equipmentItems = offer.parsedEquipment;
    }
  }

  // Calculer le total global des mensualités
  const totalGlobal = equipmentItems.reduce((sum: number, item: any) => {
    const monthlyPayment = item.monthlyPayment || 0;
    const quantity = item.quantity || 1;
    return sum + (monthlyPayment * quantity);
  }, 0);

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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">
                    Désignation
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-700 w-20">
                    Qté
                  </th>
                  <th className="text-right py-4 px-4 font-semibold text-gray-700 w-32">
                    Mensualité unitaire
                  </th>
                  <th className="text-right py-4 px-4 font-semibold text-gray-700 w-32">
                    Mensualité totale
                  </th>
                </tr>
              </thead>
              <tbody>
                {equipmentItems.map((item: any, index: number) => {
                  const monthlyPayment = item.monthlyPayment || 0;
                  const quantity = item.quantity || 1;
                  const totalMonthlyPayment = monthlyPayment * quantity;
                  
                  return (
                    <tr key={index} className={`border-b transition-colors hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                      <td className="py-6 px-6">
                        <div>
                          <div className="font-semibold text-gray-900 mb-2 text-base">
                            {item.title || `Équipement ${index + 1}`}
                          </div>
                          
                          {item.description && (
                            <p className="text-gray-600 mb-3 text-sm">{item.description}</p>
                          )}
                          
                          {/* Afficher les caractéristiques (attributes) */}
                          {item.attributes && Object.keys(item.attributes).length > 0 && (
                            <div className="text-sm text-gray-600 space-y-1 ml-2">
                              <div className="font-medium text-gray-700 mb-1">Caractéristiques:</div>
                              {Object.entries(item.attributes).map(([key, value]: [string, any]) => (
                                <div key={key} className="flex items-start">
                                  <span className="font-medium mr-2 text-gray-700 min-w-[80px]">{key}:</span>
                                  <span className="text-gray-600">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-6 px-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full font-semibold">
                          {quantity}
                        </span>
                      </td>
                      <td className="py-6 px-4 text-right font-semibold text-gray-800">
                        {formatCurrency(monthlyPayment)}
                      </td>
                      <td className="py-6 px-4 text-right font-semibold text-blue-700">
                        {formatCurrency(totalMonthlyPayment)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <td colSpan={3} className="py-4 px-6 text-right font-bold text-gray-800">
                    Mensualité totale:
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-blue-700 text-lg">
                    {formatCurrency(totalGlobal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 p-6">Aucun équipement spécifié</p>
        )}
        
        {/* Informations de financement */}
        <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 border-t">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
            Conditions de financement
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <span className="font-semibold text-gray-700 block mb-1">Durée:</span>
              <span className="text-blue-600 font-medium">36 mois</span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <span className="font-semibold text-gray-700 block mb-1">Type:</span>
              <span className="text-blue-600 font-medium">Location financière</span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <span className="font-semibold text-gray-700 block mb-1">TVA:</span>
              <span className="text-blue-600 font-medium">Non comprise</span>
            </div>
          </div>
        </div>
        
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
