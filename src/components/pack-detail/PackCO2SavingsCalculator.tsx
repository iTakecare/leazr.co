import React from "react";
import { Leaf } from "lucide-react";
// Local getCO2Savings function
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

interface PackCO2SavingsCalculatorProps {
  items: Array<{
    quantity: number;
    product?: {
      category_name?: string;
    };
  }>;
  packQuantity: number;
}

const PackCO2SavingsCalculator: React.FC<PackCO2SavingsCalculatorProps> = ({ 
  items, 
  packQuantity 
}) => {
  // Calculate total CO2 savings for all items in the pack
  const totalSavings = items.reduce((total, item) => {
    const category = item.product?.category_name || '';
    const itemQuantity = item.quantity || 1;
    
    return total + (getCO2Savings(category) * itemQuantity * packQuantity);
  }, 0);

  if (totalSavings === 0) {
    return null;
  }

  // Calculate equivalents
  const carKilometers = Math.round(totalSavings * 4.6); // 1kg CO2 = ~4.6km
  const treeMonths = Math.round(totalSavings / 22); // 1 tree absorbs ~22kg CO2/year

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
      <div className="flex items-center gap-2 mb-2">
        <Leaf className="w-5 h-5 text-green-600 dark:text-green-400" />
        <h3 className="font-semibold text-green-800 dark:text-green-200">
          Impact environnemental positif
        </h3>
      </div>
      
      <div className="space-y-1 text-sm text-green-700 dark:text-green-300">
        <p>
          En choisissant {packQuantity > 1 ? `${packQuantity} packs reconditionnés` : 'ce pack reconditionné'}, vous évitez{' '}
          <span className="font-bold">{totalSavings} kg de CO₂</span>
        </p>
        <p>
          Équivalent à <span className="font-semibold">{carKilometers} km en voiture</span> ou{' '}
          <span className="font-semibold">{treeMonths} mois d'absorption par un arbre</span>
        </p>
      </div>
      
      <p className="text-xs text-green-600 dark:text-green-400 mt-2">
        Source: Étude ADEME sur l'impact environnemental du reconditionné
      </p>
    </div>
  );
};

export default PackCO2SavingsCalculator;