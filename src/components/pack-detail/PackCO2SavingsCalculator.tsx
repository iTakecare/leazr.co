import React from "react";
import { Leaf } from "lucide-react";
import { usePackCO2Calculator } from "@/hooks/environmental/useCO2Calculator";

interface PackCO2SavingsCalculatorProps {
  items: Array<{
    quantity: number;
    product?: {
      category_name?: string;
      category?: {
        name: string;
      };
    };
  }>;
  packQuantity: number;
  companySlug?: string;
}

const PackCO2SavingsCalculator: React.FC<PackCO2SavingsCalculatorProps> = ({ 
  items, 
  packQuantity,
  companySlug
}) => {
  const { co2Kg, carKilometers, treeMonths, source, hasRealData, physicalItemsCount } = usePackCO2Calculator(
    items, 
    packQuantity, 
    companySlug
  );

  // Show calculator even if savings are low to provide visibility
  if (co2Kg <= 0) {
    return (
      <div className="bg-gradient-to-br from-[#f2fcfa] to-[#e8f7f9] border border-[#4ab6c4]/30 rounded-lg p-3 shadow-sm">
        <div className="flex items-center mb-2">
          <div className="bg-gradient-to-r from-[#33638e] to-[#4ab6c4] rounded-full p-1 text-white mr-2">
            <Leaf className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold text-[#33638e]">
            Impact environnemental positif
          </h3>
        </div>
        <p className="text-xs text-gray-600">
          Les produits de ce pack contribuent à réduire l'impact environnemental en choisissant le reconditionné.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#f2fcfa] to-[#e8f7f9] border border-[#4ab6c4]/30 rounded-lg p-3 shadow-sm">
      <div className="flex items-center mb-2">
        <div className="bg-gradient-to-r from-[#33638e] to-[#4ab6c4] rounded-full p-1 text-white mr-2">
          <Leaf className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold text-[#33638e]">
          Impact environnemental positif{hasRealData ? ' (Données réelles)' : ''}
        </h3>
      </div>
      
      <div className="mb-2">
        <p className="text-gray-700 text-xs">
          Économie avec {physicalItemsCount} {physicalItemsCount > 1 ? "appareils" : "appareil"} reconditionné{physicalItemsCount > 1 ? "s" : ""} :
        </p>
      </div>
      
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="flex items-center bg-white bg-opacity-80 rounded-lg p-2 border border-[#4ab6c4]/20">
          <div className="flex-shrink-0 mr-1 text-sm">
            🍃
          </div>
          <div>
            <div className="text-sm font-bold text-[#33638e]">{co2Kg} kg</div>
            <div className="text-[10px] text-gray-600">CO2</div>
          </div>
        </div>
        
        <div className="flex items-center bg-white bg-opacity-80 rounded-lg p-2 border border-[#4ab6c4]/20">
          <div className="flex-shrink-0 mr-1 text-sm">
            🚗
          </div>
          <div>
            <div className="text-sm font-bold text-[#33638e]">{carKilometers} km</div>
            <div className="text-[10px] text-gray-600">en voiture</div>
          </div>
        </div>
        
        <div className="flex items-center bg-white bg-opacity-80 rounded-lg p-2 border border-[#4ab6c4]/20">
          <div className="flex-shrink-0 mr-1 text-sm">
            🌳
          </div>
          <div>
            <div className="text-sm font-bold text-[#33638e]">{treeMonths} mois</div>
            <div className="text-[10px] text-gray-600">d'un arbre</div>
          </div>
        </div>
      </div>
      
      <div className="text-right">
        <span className="text-[8px] text-gray-500 italic">* Source: <a 
          href={source.startsWith('http') ? source : 'https://impactco2.fr'} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[8px] text-[#33638e] hover:underline inline-block"
        >
          {source}
        </a></span>
      </div>
    </div>
  );
};

export default PackCO2SavingsCalculator;