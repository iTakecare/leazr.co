
import React, { useState, useEffect } from "react";
import { formatCurrency } from "@/utils/formatters";
import { 
  Card, 
  CardHeader,
  CardTitle, 
  CardContent
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getOfferEquipment } from "@/services/offers/offerEquipment";

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
  offerId?: string;
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
  offerId
}) => {
  const [equipmentItems, setEquipmentItems] = useState<EquipmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fonction pour parser les données texte en fallback
  const parseEquipmentFromText = (description: string, totalMonthlyPayment: number): EquipmentItem[] => {
    if (!description) return [];
    
    try {
      // Essayer de parser comme JSON d'abord
      if (description.startsWith('[') || description.startsWith('{')) {
        const parsed = JSON.parse(description);
        if (Array.isArray(parsed)) {
          return parsed.map(item => ({
            title: item.title || 'Équipement',
            quantity: Number(item.quantity) || 1,
            purchasePrice: Number(item.purchasePrice) || 0,
            monthlyPayment: Number(item.monthlyPayment) || 0,
            attributes: item.attributes || {},
            specifications: item.specifications || {}
          }));
        } else {
          return [{
            title: parsed.title || 'Équipement',
            quantity: Number(parsed.quantity) || 1,
            purchasePrice: Number(parsed.purchasePrice) || 0,
            monthlyPayment: Number(parsed.monthlyPayment) || totalMonthlyPayment,
            attributes: parsed.attributes || {},
            specifications: parsed.specifications || {}
          }];
        }
      }
    } catch (e) {
      console.error("Erreur lors du parsing JSON:", e);
    }
    
    // Parsing texte simple
    const lines = description.split(/[,\n]/).map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length > 1) {
      const monthlyPaymentPerItem = totalMonthlyPayment / lines.length;
      
      return lines.map(line => {
        let title = line;
        let quantity = 1;
        let unitPrice = monthlyPaymentPerItem;
        
        // Détecter la quantité
        const quantityPatterns = [
          /^(\d+)\s*[x×]\s*(.+)/i,
          /^(.+)\s*[x×]\s*(\d+)$/i,
          /^(\d+)\s+(.+)/i,
          /^(.+)\s*\(\s*(\d+)\s*\)$/i
        ];
        
        for (const pattern of quantityPatterns) {
          const match = line.match(pattern);
          if (match) {
            if (pattern.source.startsWith('^(\\d+)')) {
              quantity = parseInt(match[1], 10);
              title = match[2].trim();
            } else {
              title = match[1].trim();
              quantity = parseInt(match[2], 10);
            }
            break;
          }
        }
        
        // Détecter le prix
        const pricePattern = /(\d+(?:[.,]\d{1,2})?)\s*€/;
        const priceMatch = line.match(pricePattern);
        if (priceMatch) {
          unitPrice = parseFloat(priceMatch[1].replace(',', '.'));
          title = title.replace(/\s*-?\s*\d+(?:[.,]\d{1,2})?\s*€.*$/, '').trim();
        }
        
        return {
          title: title || 'Équipement',
          quantity: quantity,
          monthlyPayment: unitPrice,
          attributes: {},
          specifications: {}
        };
      });
    }
    
    return [{
      title: description || "Équipement",
      quantity: 1,
      monthlyPayment: totalMonthlyPayment,
      attributes: {},
      specifications: {}
    }];
  };

  useEffect(() => {
    const loadEquipmentData = async () => {
      setIsLoading(true);
      
      // D'abord essayer de récupérer les données structurées depuis la DB
      if (offerId) {
        try {
          console.log("Loading equipment data for offer:", offerId);
          const dbEquipment = await getOfferEquipment(offerId);
          console.log("DB Equipment data:", dbEquipment);
          
          if (dbEquipment && dbEquipment.length > 0) {
            // Convertir les données DB en format d'affichage
            const formattedEquipment: EquipmentItem[] = dbEquipment.map(item => {
              const attributes: Record<string, any> = {};
              if (item.attributes && item.attributes.length > 0) {
                item.attributes.forEach(attr => {
                  attributes[attr.key] = attr.value;
                });
              }
              
              const specifications: Record<string, any> = {};
              if (item.specifications && item.specifications.length > 0) {
                item.specifications.forEach(spec => {
                  const numValue = Number(spec.value);
                  specifications[spec.key] = !isNaN(numValue) ? numValue : spec.value;
                });
              }
              
              return {
                title: item.title,
                quantity: item.quantity,
                purchasePrice: item.purchase_price || 0,
                monthlyPayment: item.monthly_payment || 0,
                attributes,
                specifications
              };
            });
            
            console.log("Formatted equipment from DB:", formattedEquipment);
            setEquipmentItems(formattedEquipment);
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error("Error loading equipment from DB:", error);
        }
      }
      
      // Fallback: parser les données texte
      console.log("Falling back to text parsing for equipment:", equipmentDisplay);
      const parsedFromText = parseEquipmentFromText(equipmentDisplay, monthlyPayment);
      console.log("Parsed equipment from text:", parsedFromText);
      setEquipmentItems(parsedFromText);
      setIsLoading(false);
    };

    loadEquipmentData();
  }, [offerId, equipmentDisplay, monthlyPayment]);

  const totalMonthly = equipmentItems.reduce((sum, item) => sum + (item.monthlyPayment * item.quantity), 0);

  console.log("Final equipment items:", equipmentItems);
  console.log("Calculated total monthly:", totalMonthly);
  console.log("Expected total monthly:", monthlyPayment);

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader className="bg-gray-50 border-b">
          <CardTitle className="text-lg font-semibold text-gray-800">
            Équipement et financement
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-center">Chargement des équipements...</div>
        </CardContent>
      </Card>
    );
  }

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
                  Mensualité unitaire HT
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-700 w-32">
                  Mensualité totale HT
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
                  <td className="py-4 px-4 text-right font-medium">
                    {formatCurrency(item.monthlyPayment * item.quantity)}
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
                {formatCurrency(monthlyPayment)} /mois
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
