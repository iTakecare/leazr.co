
import React, { useState, useEffect } from "react";
import { Leaf } from "lucide-react";

interface CO2SavingsCalculatorProps {
  category: string;
  quantity: number;
}

const CO2SavingsCalculator: React.FC<CO2SavingsCalculatorProps> = ({ 
  category,
  quantity
}) => {
  const [totalSavings, setTotalSavings] = useState(0);
  
  const getCO2Savings = (category: string): number => {
    switch (category.toLowerCase()) {
      case "laptop":
      case "desktop":
        return 170;
      case "smartphone":
        return 45;
      case "tablet":
        return 87;
      default:
        return 0;
    }
  };
  
  useEffect(() => {
    const savingsPerUnit = getCO2Savings(category);
    setTotalSavings(savingsPerUnit * quantity);
  }, [category, quantity]);
  
  if (totalSavings === 0) return null;
  
  const carKmEquivalent = Math.round(totalSavings * 6); // ~6km de voiture par kg de CO2
  const treeMonthsEquivalent = Math.round(totalSavings / 20); // ~20kg CO2 absorbés par arbre par mois
  
  return (
    <div className="bg-gradient-to-br from-[#f2fcfa] to-[#e8f7f9] border border-[#4ab6c4]/30 rounded-lg p-2 shadow-sm">
      <div className="flex items-center mb-1">
        <div className="bg-gradient-to-r from-[#33638e] to-[#4ab6c4] rounded-full p-1 text-white mr-1.5">
          <Leaf className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-xs font-semibold text-[#33638e]">
          Impact environnemental positif
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
            <div className="text-sm font-bold text-[#33638e]">{totalSavings} kg</div>
            <div className="text-[10px] text-gray-600">CO2</div>
          </div>
        </div>
        
        <div className="flex items-center bg-white bg-opacity-80 rounded-lg p-1.5 border border-[#4ab6c4]/20">
          <div className="flex-shrink-0 mr-1 text-sm">
            🚗
          </div>
          <div>
            <div className="text-sm font-bold text-[#33638e]">{carKmEquivalent} km</div>
            <div className="text-[10px] text-gray-600">en voiture</div>
          </div>
        </div>
        
        <div className="flex items-center bg-white bg-opacity-80 rounded-lg p-1.5 border border-[#4ab6c4]/20">
          <div className="flex-shrink-0 mr-1 text-sm">
            🌳
          </div>
          <div>
            <div className="text-sm font-bold text-[#33638e]">{treeMonthsEquivalent} mois</div>
            <div className="text-[10px] text-gray-600">d'un arbre</div>
          </div>
        </div>
      </div>
      
      <div className="text-right">
        <span className="text-[8px] text-gray-500 italic">* Source: <a 
          href="https://impactco2.fr" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[8px] text-[#33638e] hover:underline inline-block"
        >
          impactco2.fr
        </a></span>
      </div>
    </div>
  );
};

export default CO2SavingsCalculator;
