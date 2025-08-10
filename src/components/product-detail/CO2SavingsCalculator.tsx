
import React from "react";
import { Leaf } from "lucide-react";
import { useCO2Calculator } from "@/hooks/environmental/useCO2Calculator";

interface CO2SavingsCalculatorProps {
  category: string;
  quantity: number;
  companySlug?: string;
}

const CO2SavingsCalculator: React.FC<CO2SavingsCalculatorProps> = ({ 
  category,
  quantity,
  companySlug
}) => {
  const { co2Kg, carKilometers, treeMonths, source, hasRealData } = useCO2Calculator({
    category,
    quantity,
    companySlug
  });
  
  if (co2Kg === 0) return null;
  
  return (
    <div className="bg-gradient-to-br from-[#f2fcfa] to-[#e8f7f9] border border-[#4ab6c4]/30 rounded-lg p-2 shadow-sm">
      <div className="flex items-center mb-1">
        <div className="bg-gradient-to-r from-[#33638e] to-[#4ab6c4] rounded-full p-1 text-white mr-1.5">
          <Leaf className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-xs font-semibold text-[#33638e]">
          Impact environnemental positif{hasRealData ? ' (Données réelles)' : ''}
        </h3>
      </div>
      
      <div className="mb-1.5">
        <p className="text-gray-700 text-xs">
          Économie avec {quantity} {quantity > 1 ? "appareils" : "appareil"} reconditionné(s):
        </p>
      </div>
      
      <div className="grid grid-cols-3 gap-1.5 mb-1">
        <div className="flex items-center bg-white bg-opacity-80 rounded-lg p-1.5 border border-[#4ab6c4]/20">
          <div className="flex-shrink-0 mr-1 text-sm">
            🍃
          </div>
          <div>
            <div className="text-sm font-bold text-[#33638e]">{co2Kg} kg</div>
            <div className="text-[10px] text-gray-600">CO2</div>
          </div>
        </div>
        
        <div className="flex items-center bg-white bg-opacity-80 rounded-lg p-1.5 border border-[#4ab6c4]/20">
          <div className="flex-shrink-0 mr-1 text-sm">
            🚗
          </div>
          <div>
            <div className="text-sm font-bold text-[#33638e]">{carKilometers} km</div>
            <div className="text-[10px] text-gray-600">en voiture</div>
          </div>
        </div>
        
        <div className="flex items-center bg-white bg-opacity-80 rounded-lg p-1.5 border border-[#4ab6c4]/20">
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

export default CO2SavingsCalculator;
