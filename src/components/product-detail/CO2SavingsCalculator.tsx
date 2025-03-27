
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
  
  // Fonction pour calculer l'économie de CO2 selon la catégorie du produit
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
  
  // Si aucune économie CO2, ne pas afficher le calculateur
  if (totalSavings === 0) return null;
  
  // Calculer quelques équivalences pour rendre l'information plus concrète
  const carKmEquivalent = Math.round(totalSavings * 6); // ~6km de voiture par kg de CO2
  const treeMonthsEquivalent = Math.round(totalSavings / 20); // ~20kg CO2 absorbés par arbre par mois
  
  return (
    <div className="bg-gradient-to-br from-[#eefdf6] to-[#e2f9e7] border border-[#38b77c]/30 rounded-xl p-3 shadow-sm">
      <div className="flex items-center mb-2">
        <div className="bg-[#38b77c] rounded-full p-1.5 text-white mr-2">
          <Leaf className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold text-[#33638e]">
          Impact environnemental positif
        </h3>
      </div>
      
      <div className="mb-2">
        <p className="text-gray-700 text-xs">
          En choisissant {quantity} {quantity > 1 ? "appareils reconditionnés" : "appareil reconditionné"}, 
          vous économisez:
        </p>
      </div>
      
      <div className="flex flex-col gap-2 mb-2">
        <div className="flex items-center bg-white bg-opacity-80 rounded-lg p-2 border border-[#38b77c]/20">
          <div className="flex-shrink-0 rounded-full p-1 mr-2 text-lg">
            🍃
          </div>
          <div>
            <div className="text-base font-bold text-[#38b77c]">{totalSavings} kg</div>
            <div className="text-xs text-gray-600">d'équivalent CO2</div>
          </div>
        </div>
        
        <div className="flex items-center bg-white bg-opacity-80 rounded-lg p-2 border border-[#38b77c]/20">
          <div className="flex-shrink-0 rounded-full p-1 mr-2 text-lg">
            🚗
          </div>
          <div>
            <div className="text-base font-bold text-[#38b77c]">{carKmEquivalent} km</div>
            <div className="text-xs text-gray-600">de trajet en voiture</div>
          </div>
        </div>
        
        <div className="flex items-center bg-white bg-opacity-80 rounded-lg p-2 border border-[#38b77c]/20">
          <div className="flex-shrink-0 rounded-full p-1 mr-2 text-lg">
            🌳
          </div>
          <div>
            <div className="text-base font-bold text-[#38b77c]">{treeMonthsEquivalent} {treeMonthsEquivalent > 1 ? "mois" : "mois"}</div>
            <div className="text-xs text-gray-600">d'absorption d'un arbre</div>
          </div>
        </div>
      </div>
      
      <p className="text-[10px] text-gray-500 italic">
        * Estimations basées sur des études comparant la production d'équipements neufs vs. reconditionnés.
      </p>
    </div>
  );
};

export default CO2SavingsCalculator;
