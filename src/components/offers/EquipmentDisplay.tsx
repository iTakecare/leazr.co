
import React from "react";
import { formatCurrency } from "@/utils/formatters";
import { 
  Card, 
  CardHeader,
  CardTitle, 
  CardContent
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface EquipmentDisplayProps {
  equipmentDisplay: string;
  monthlyPayment: number;
  remarks?: string;
  clientName?: string;
  clientEmail?: string;
  clientCompany?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientCity?: string;
  clientPostalCode?: string;
  clientCountry?: string;
}

interface EquipmentItem {
  title: string;
  quantity: number;
  purchasePrice?: number;
  monthlyPayment: number;
  attributes?: Record<string, any>;
  specifications?: Record<string, any>;
}

const EquipmentDisplay: React.FC<EquipmentDisplayProps> = ({
  equipmentDisplay,
  monthlyPayment,
  remarks,
  clientName,
  clientEmail,
  clientCompany,
  clientPhone,
  clientAddress,
  clientCity,
  clientPostalCode,
  clientCountry
}) => {
  // Parse equipment data if it's JSON
  const parseEquipmentData = (): EquipmentItem[] => {
    try {
      if (equipmentDisplay.startsWith('[') || equipmentDisplay.startsWith('{')) {
        const parsed = JSON.parse(equipmentDisplay);
        return Array.isArray(parsed) ? parsed : [parsed];
      }
    } catch (e) {
      // If parsing fails, create a simple item from the text
    }
    
    // Fallback: create a single item from the display text
    return [{
      title: equipmentDisplay || "Équipement",
      quantity: 1,
      monthlyPayment: monthlyPayment
    }];
  };

  const equipmentItems = parseEquipmentData();
  const totalMonthly = equipmentItems.reduce((sum, item) => sum + (item.monthlyPayment * item.quantity), 0);

  return (
    <Card className="mb-6">
      <CardHeader className="bg-gray-50 border-b">
        <CardTitle className="text-lg font-semibold text-gray-800">
          Équipement et financement
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Equipment Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="text-left py-3 px-4 font-medium text-gray-700 min-w-[400px]">
                  Désignation
                </th>
                <th className="text-center py-3 px-4 font-medium text-gray-700 w-20">
                  Qté
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-700 w-32">
                  Mensualité HT
                </th>
              </tr>
            </thead>
            <tbody>
              {equipmentItems.map((item, index) => (
                <tr key={index} className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-medium text-gray-900 mb-1">
                        {item.title}
                      </div>
                      
                      {/* Display attributes if available */}
                      {item.attributes && Object.keys(item.attributes).length > 0 && (
                        <div className="text-sm text-gray-600 space-y-1">
                          {Object.entries(item.attributes).map(([key, value]) => (
                            <div key={key} className="flex">
                              <span className="font-medium mr-2">{key}:</span>
                              <span>{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Display specifications if available */}
                      {item.specifications && Object.keys(item.specifications).length > 0 && (
                        <div className="text-sm text-gray-600 mt-2 space-y-1">
                          {Object.entries(item.specifications).map(([key, value]) => (
                            <div key={key} className="flex">
                              <span className="font-medium mr-2">{key}:</span>
                              <span>{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center font-medium">
                    {item.quantity}
                  </td>
                  <td className="py-4 px-4 text-right font-medium">
                    {formatCurrency(item.monthlyPayment)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total Section */}
        <div className="border-t-2 border-gray-300 bg-gray-50">
          <div className="flex justify-end p-4">
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">Total mensualité HT</div>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(totalMonthly)} /mois
              </div>
            </div>
          </div>
        </div>

        {/* Financing Details */}
        <div className="p-4 bg-blue-50 border-t">
          <h3 className="font-semibold text-gray-800 mb-3">Conditions de financement</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Durée:</span>
              <span className="ml-2">36 mois</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Type:</span>
              <span className="ml-2">Location financière</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">TVA:</span>
              <span className="ml-2">Non comprise</span>
            </div>
          </div>
        </div>

        {/* Remarks Section */}
        {remarks && (
          <>
            <Separator />
            <div className="p-4">
              <div className="font-medium text-gray-700 mb-2">Remarques</div>
              <div className="text-gray-600 whitespace-pre-wrap">{remarks}</div>
            </div>
          </>
        )}

        {/* Signature Section */}
        <div className="p-6 bg-gray-50 border-t">
          <div className="text-center">
            <h3 className="font-semibold text-gray-800 mb-2">Validation de l'offre</h3>
            <p className="text-sm text-gray-600 mb-4">
              En signant cette offre, vous acceptez les conditions de financement proposées
            </p>
            <div className="text-xs text-gray-500">
              Cette offre est valable 30 jours à compter de sa date d'émission
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EquipmentDisplay;
