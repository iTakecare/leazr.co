
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";

interface PackSelectionProps {
  packs: Record<string, any>;
  selectedPack: string;
  onSelect: (packId: string) => void;
  totalDevices?: number;
  getDiscountedMonthlyPrice?: (packId: string) => number;
  contractDuration?: number;
}

const PackSelection: React.FC<PackSelectionProps> = ({ 
  packs, 
  selectedPack, 
  onSelect,
  totalDevices = 0,
  getDiscountedMonthlyPrice,
  contractDuration = 36
}) => {
  const packIds = Object.keys(packs);

  // Format currency
  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)}€`;
  };

  // Sélection de quelques fonctionnalités clés pour l'aperçu
  const keyFeatures = [
    { id: "support", label: "Support" },
    { id: "supportHours", label: "Disponibilité" },
    { id: "deviceReplacement", label: "Renouvellement" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {packIds.map((packId) => {
        const pack = packs[packId];
        const hasDiscount = totalDevices >= 5 && getDiscountedMonthlyPrice;
        const discountedPrice = hasDiscount ? getDiscountedMonthlyPrice(packId) : pack.monthlyPrice;
        const totalForAllDevices = discountedPrice * totalDevices;
        const totalForContractPeriod = totalForAllDevices * contractDuration;
        
        return (
          <div key={packId} onClick={() => onSelect(packId)} className="cursor-pointer">
            <Card className={`overflow-hidden h-full border-2 transition-colors ${
              selectedPack === packId ? "border-blue-500" : "border-gray-200 hover:border-gray-300"
            }`}>
              <div className={`w-full h-2 ${pack.color}`}></div>
              <CardContent className="p-6">
                <div className="flex items-start">
                  <RadioGroupItem 
                    value={packId} 
                    id={`pack-${packId}`} 
                    className="mt-1" 
                    checked={selectedPack === packId}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(packId);
                    }}
                  />
                  <div className="ml-3">
                    <Label htmlFor={`pack-${packId}`} className="font-bold text-lg">
                      {pack.name}
                    </Label>
                    
                    {hasDiscount ? (
                      <>
                        <p className="text-2xl font-bold mt-2">{formatCurrency(discountedPrice)}</p>
                        <p className="text-sm text-gray-500">
                          <span className="line-through">{formatCurrency(pack.monthlyPrice)}</span> par mois / par appareil
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-2xl font-bold mt-2">{formatCurrency(pack.monthlyPrice)}</p>
                        <p className="text-sm text-gray-500">par mois / par appareil</p>
                      </>
                    )}
                    
                    {totalDevices > 0 && (
                      <div className="mt-2 p-2 bg-gray-50 rounded-md">
                        <p className="text-sm font-medium">Total pour {totalDevices} appareils:</p>
                        <p className="text-sm">{formatCurrency(totalForAllDevices)} / mois</p>
                        <p className="text-sm font-bold">
                          {formatCurrency(totalForContractPeriod)} / {contractDuration} mois
                        </p>
                      </div>
                    )}
                    
                    <div className="mt-4 space-y-2">
                      {keyFeatures.map((feature) => (
                        <div key={feature.id} className="flex items-center">
                          <Check className="h-4 w-4 text-green-600 mr-2" />
                          <span className="text-sm">
                            {feature.label}: {pack.features[feature.id]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
};

export default PackSelection;
