
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
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
            <Card className={`overflow-hidden h-full border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] ${
              selectedPack === packId ? "border-black bg-[#C0C7C8]" : "border-gray-400 bg-[#C0C7C8] hover:border-gray-500"
            }`}>
              <div className={`w-full h-6 flex items-center justify-between bg-[#000080] text-white px-2`}>
                <span className="text-sm font-bold">{pack.name}</span>
                <div className="flex space-x-1">
                  <button className="w-4 h-4 flex items-center justify-center bg-[#C0C7C8] text-black text-xs border border-black">_</button>
                  <button className="w-4 h-4 flex items-center justify-center bg-[#C0C7C8] text-black text-xs border border-black">■</button>
                  <button className="w-4 h-4 flex items-center justify-center bg-[#C0C7C8] text-black text-xs border border-black">✕</button>
                </div>
              </div>
              <CardContent className="p-3 pt-4 bg-[#C0C7C8]">
                <div className="flex items-start">
                  <div className="flex items-center h-5 mt-1">
                    <div className={`w-5 h-5 border-2 border-black bg-white flex items-center justify-center ${
                      selectedPack === packId ? "bg-white" : "bg-white"
                    }`}>
                      {selectedPack === packId && (
                        <div className="w-2 h-2 bg-black"></div>
                      )}
                    </div>
                  </div>
                  <div className="ml-3">
                    <Label htmlFor={`pack-${packId}`} className="font-bold text-lg">
                      {pack.name}
                    </Label>
                    
                    {hasDiscount ? (
                      <>
                        <div className="bg-[#C0C7C8] border-2 border-black border-t-[#FFFFFF] border-l-[#FFFFFF] p-2 mt-2">
                          <p className="text-2xl font-bold">{formatCurrency(discountedPrice)}</p>
                          <p className="text-sm text-gray-700">
                            <span className="line-through">{formatCurrency(pack.monthlyPrice)}</span> par mois / par appareil
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="bg-[#C0C7C8] border-2 border-black border-t-[#FFFFFF] border-l-[#FFFFFF] p-2 mt-2">
                          <p className="text-2xl font-bold">{formatCurrency(pack.monthlyPrice)}</p>
                          <p className="text-sm text-gray-700">par mois / par appareil</p>
                        </div>
                      </>
                    )}
                    
                    {totalDevices > 0 && (
                      <div className="mt-2 p-2 bg-[#C0C7C8] border-2 border-black border-t-[#FFFFFF] border-l-[#FFFFFF]">
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
                          <div className="w-4 h-4 mr-2 border border-black bg-green-600 flex items-center justify-center text-white text-xs">
                            ✓
                          </div>
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
