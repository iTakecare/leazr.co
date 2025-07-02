
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/button";

interface CompactEquipmentSectionProps {
  offer: any;
  hideFinancialColumns?: boolean;
}

const CompactEquipmentSection: React.FC<CompactEquipmentSectionProps> = ({ offer, hideFinancialColumns = false }) => {
  const [expandedItems, setExpandedItems] = useState<number[]>([]);
  
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
        quantity: 1,
        purchasePrice: offer.amount || 0,
        monthlyPayment: offer.monthly_payment || 0,
        margin: 0
      }];
    }
  }

  // Utiliser les équipements parsés depuis parsedEquipment si disponibles
  if (offer.parsedEquipment && offer.parsedEquipment.length > 0) {
    equipmentItems = offer.parsedEquipment;
  }

  const toggleExpanded = (index: number) => {
    setExpandedItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const calculateTotal = () => {
    return equipmentItems.reduce((total: number, item: any) => {
      const price = parseFloat(item.purchasePrice) || 0;
      const qty = parseInt(item.quantity) || 1;
      return total + (price * qty);
    }, 0);
  };

  const calculateTotalMonthly = () => {
    return equipmentItems.reduce((total: number, item: any) => {
      const monthly = parseFloat(item.monthlyPayment) || 0;
      const qty = parseInt(item.quantity) || 1;
      return total + (monthly * qty);
    }, 0);
  };

  // Calculer la marge totale à partir du résumé financier de l'offre plutôt que des items individuels
  const calculateTotalMargin = () => {
    // Utiliser la marge de l'offre qui est correcte
    return offer.margin || offer.total_margin_with_difference || 0;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="w-5 h-5" />
          Équipements ({equipmentItems.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {equipmentItems.length > 0 ? (
          <div className="overflow-hidden">
            {/* En-tête du tableau */}
            <div className="bg-gray-50 border-b grid gap-2 px-4 py-2 text-sm font-medium text-gray-700" 
                 style={{ gridTemplateColumns: hideFinancialColumns ? '5fr 1fr 2fr 1fr' : '4fr 1fr 2fr 2fr 2fr 1fr' }}>
              <div>Équipement</div>
              <div className="text-center">Qté</div>
              {!hideFinancialColumns && <div className="text-right">Prix d'achat</div>}
              <div className="text-right">Mensualité</div>
              {!hideFinancialColumns && <div className="text-right">Marge</div>}
              <div></div>
            </div>
            
            {/* Lignes des équipements */}
            {equipmentItems.map((item: any, index: number) => {
              const isExpanded = expandedItems.includes(index);
              const hasAttributes = item.attributes && Object.keys(item.attributes).length > 0;
              
              // Calculer la marge proportionnelle pour cet équipement
              const itemPurchasePrice = (parseFloat(item.purchasePrice) || 0) * (parseInt(item.quantity) || 1);
              const totalPurchasePrice = calculateTotal();
              const totalMargin = calculateTotalMargin();
              const proportionalMargin = totalPurchasePrice > 0 ? (itemPurchasePrice / totalPurchasePrice) * totalMargin : 0;
              
              return (
                <div key={index} className="border-b last:border-b-0">
                  {/* Ligne principale */}
                  <div className="grid gap-2 px-4 py-3 text-sm hover:bg-gray-50"
                       style={{ gridTemplateColumns: hideFinancialColumns ? '5fr 1fr 2fr 1fr' : '4fr 1fr 2fr 2fr 2fr 1fr' }}>
                    <div>
                      <div className="font-medium truncate">{item.title || `Équipement ${index + 1}`}</div>
                      {item.description && (
                        <div className="text-xs text-gray-500 truncate mt-1">{item.description}</div>
                      )}
                    </div>
                    <div className="text-center font-medium">
                      {item.quantity || 1}
                    </div>
                    {!hideFinancialColumns && (
                      <div className="text-right font-medium">
                        {item.purchasePrice ? formatCurrency(item.purchasePrice) : '-'}
                      </div>
                    )}
                    <div className="text-right font-medium text-green-600">
                      {item.monthlyPayment ? formatCurrency(item.monthlyPayment) : '-'}
                    </div>
                    {!hideFinancialColumns && (
                      <div className="text-right font-medium text-purple-600">
                        {formatCurrency(proportionalMargin)}
                      </div>
                    )}
                    <div className="text-center">
                      {hasAttributes && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => toggleExpanded(index)}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Ligne des caractéristiques (expandable) */}
                  {hasAttributes && isExpanded && (
                    <div className="px-4 py-2 bg-gray-50 border-t">
                      <div className="text-xs font-medium text-gray-600 mb-1">Caractéristiques:</div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                        {Object.entries(item.attributes).map(([key, value]: [string, any]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-500">{key}:</span>
                            <span className="font-medium ml-2">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Ligne de total */}
            {equipmentItems.length > 1 && (
              <div className="bg-gray-100 border-t-2 grid gap-2 px-4 py-3 text-sm font-semibold"
                   style={{ gridTemplateColumns: hideFinancialColumns ? '5fr 1fr 2fr 1fr' : '4fr 1fr 2fr 2fr 2fr 1fr' }}>
                <div>TOTAL</div>
                <div className="text-center">
                  {equipmentItems.reduce((sum: number, item: any) => sum + (parseInt(item.quantity) || 1), 0)}
                </div>
                {!hideFinancialColumns && (
                  <div className="text-right text-blue-600">
                    {formatCurrency(calculateTotal())}
                  </div>
                )}
                <div className="text-right text-green-600">
                  {formatCurrency(calculateTotalMonthly())}
                </div>
                {!hideFinancialColumns && (
                  <div className="text-right text-purple-600">
                    {formatCurrency(calculateTotalMargin())}
                  </div>
                )}
                <div></div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-500 text-center py-8 px-4">Aucun équipement spécifié</div>
        )}
        
        {offer.remarks && (
          <div className="px-4 py-3 border-t bg-yellow-50">
            <div className="text-sm font-medium text-gray-700 mb-1">Remarques:</div>
            <div className="text-sm text-gray-600">{offer.remarks}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CompactEquipmentSection;
