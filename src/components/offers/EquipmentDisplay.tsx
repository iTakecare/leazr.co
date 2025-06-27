
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
            title: item.title || item.name || 'Équipement',
            quantity: Number(item.quantity) || 1,
            purchasePrice: Number(item.purchasePrice || item.purchase_price || item.price) || 0,
            monthlyPayment: Number(item.monthlyPayment || item.monthly_payment) || 0,
            attributes: item.attributes || {},
            specifications: item.specifications || {}
          }));
        } else {
          return [{
            title: parsed.title || parsed.name || 'Équipement',
            quantity: Number(parsed.quantity) || 1,
            purchasePrice: Number(parsed.purchasePrice || parsed.purchase_price || parsed.price) || 0,
            monthlyPayment: Number(parsed.monthlyPayment || parsed.monthly_payment) || totalMonthlyPayment,
            attributes: parsed.attributes || {},
            specifications: parsed.specifications || {}
          }];
        }
      }
    } catch (e) {
      console.error("Erreur lors du parsing JSON:", e);
    }
    
    // Parsing texte simple avec détection améliorée
    const lines = description.split(/[,\n]/).map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length > 1) {
      const monthlyPaymentPerItem = totalMonthlyPayment / lines.length;
      
      return lines.map(line => {
        let title = line;
        let quantity = 1;
        let unitPrice = 0;
        let monthlyPaymentUnit = monthlyPaymentPerItem;
        
        // Détecter la quantité avec différents patterns
        const quantityPatterns = [
          /^(\d+)\s*[x×]\s*(.+)/i,
          /^(.+)\s*[x×]\s*(\d+)$/i,
          /^(\d+)\s+(.+)/i,
          /^(.+)\s*\(\s*(\d+)\s*\)$/i,
          /(\d+)\s*unités?\s*(.+)/i
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
        
        // Détecter le prix avec différents formats
        const pricePatterns = [
          /(\d+(?:[.,]\d{1,2})?)\s*€/,
          /€\s*(\d+(?:[.,]\d{1,2})?)/,
          /prix[:\s]*(\d+(?:[.,]\d{1,2})?)/i,
          /(\d+(?:[.,]\d{1,2})?)\s*euros?/i
        ];
        
        for (const pattern of pricePatterns) {
          const priceMatch = line.match(pattern);
          if (priceMatch) {
            unitPrice = parseFloat(priceMatch[1].replace(',', '.'));
            title = title.replace(pattern, '').trim();
            break;
          }
        }
        
        return {
          title: title || 'Équipement',
          quantity: quantity,
          purchasePrice: unitPrice,
          monthlyPayment: monthlyPaymentUnit,
          attributes: {},
          specifications: {}
        };
      });
    }
    
    return [{
      title: description || "Équipement",
      quantity: 1,
      purchasePrice: 0,
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
      
      // Fallback: parser les données texte avec amélioration
      console.log("Falling back to text parsing for equipment:", equipmentDisplay);
      const parsedFromText = parseEquipmentFromText(equipmentDisplay, monthlyPayment);
      console.log("Parsed equipment from text:", parsedFromText);
      setEquipmentItems(parsedFromText);
      setIsLoading(false);
    };

    loadEquipmentData();
  }, [offerId, equipmentDisplay, monthlyPayment]);

  // Calculer les totaux corrects
  const totalMonthlyCalculated = equipmentItems.reduce((sum, item) => sum + (item.monthlyPayment * item.quantity), 0);
  const totalMonthlyToShow = totalMonthlyCalculated > 0 ? totalMonthlyCalculated : monthlyPayment;

  console.log("Final equipment items:", equipmentItems);
  console.log("Calculated total monthly:", totalMonthlyCalculated);
  console.log("Expected total monthly:", monthlyPayment);
  console.log("Total monthly to show:", totalMonthlyToShow);

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="text-lg font-semibold text-gray-800">
            Équipement et financement
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-center flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span>Chargement des équipements...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
          <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
          Équipement et financement
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Equipment Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                <th className="text-left py-4 px-6 font-semibold text-gray-700 min-w-[400px]">
                  Désignation
                </th>
                <th className="text-center py-4 px-4 font-semibold text-gray-700 w-24">
                  Qté
                </th>
                <th className="text-right py-4 px-4 font-semibold text-gray-700 w-40">
                  Prix d'achat HT
                </th>
                <th className="text-right py-4 px-4 font-semibold text-gray-700 w-40">
                  Mensualité HT
                </th>
              </tr>
            </thead>
            <tbody>
              {equipmentItems.map((item, index) => (
                <tr key={index} className={`border-b transition-colors hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                  <td className="py-6 px-6">
                    <div>
                      <div className="font-semibold text-gray-900 mb-2 text-base">
                        {item.title}
                      </div>
                      
                      {/* Display attributes if available */}
                      {item.attributes && Object.keys(item.attributes).length > 0 && (
                        <div className="text-sm text-gray-600 space-y-1 ml-2">
                          {Object.entries(item.attributes).map(([key, value]) => (
                            <div key={key} className="flex items-start">
                              <span className="font-medium mr-2 text-gray-700 min-w-[80px]">{key}:</span>
                              <span className="text-gray-600">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Display specifications if available */}
                      {item.specifications && Object.keys(item.specifications).length > 0 && (
                        <div className="text-sm text-blue-600 mt-3 ml-2">
                          <div className="font-medium text-blue-700 mb-1">Spécifications:</div>
                          <div className="space-y-1">
                            {Object.entries(item.specifications).map(([key, value]) => (
                              <div key={key} className="flex items-start">
                                <span className="font-medium mr-2 min-w-[80px]">{key}:</span>
                                <span>{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-6 px-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full font-semibold">
                      {item.quantity}
                    </span>
                  </td>
                  <td className="py-6 px-4 text-right font-semibold text-gray-800">
                    {item.purchasePrice > 0 ? formatCurrency(item.purchasePrice) : '-'}
                  </td>
                  <td className="py-6 px-4 text-right font-semibold text-blue-700">
                    {formatCurrency(item.monthlyPayment * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total Section */}
        <div className="border-t-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex justify-between items-center p-6">
            <div className="text-left">
              <div className="text-sm text-gray-600 mb-1">Modalité de financement</div>
              <div className="text-base font-semibold text-gray-800">Location financière - 36 mois</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">Total mensualité HT</div>
              <div className="text-3xl font-bold text-blue-700">
                {formatCurrency(totalMonthlyToShow)} <span className="text-lg font-normal">/mois</span>
              </div>
            </div>
          </div>
        </div>

        {/* Financing Details */}
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

        {/* Remarks Section */}
        {remarks && (
          <>
            <Separator />
            <div className="p-6 bg-amber-50 border-t border-amber-200">
              <div className="flex items-start">
                <div className="w-2 h-2 bg-amber-500 rounded-full mr-3 mt-2"></div>
                <div>
                  <div className="font-semibold text-amber-800 mb-2">Remarques importantes</div>
                  <div className="text-amber-700 whitespace-pre-wrap leading-relaxed">{remarks}</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Signature Section */}
        <div className="p-8 bg-gradient-to-r from-green-50 to-emerald-50 border-t border-green-200">
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-6 h-6 bg-green-500 rounded-full"></div>
            </div>
            <h3 className="font-semibold text-green-800 mb-3 text-lg">Validation de l'offre</h3>
            <p className="text-green-700 mb-4 max-w-md mx-auto leading-relaxed">
              En signant cette offre, vous acceptez les conditions de financement proposées
            </p>
            <div className="text-xs text-green-600 bg-green-100 inline-block px-3 py-1 rounded-full">
              Cette offre est valable 30 jours à compter de sa date d'émission
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EquipmentDisplay;
