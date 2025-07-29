import React from "react";
import { Leaf } from "lucide-react";

// Enhanced getCO2Savings function with more categories
const getCO2Savings = (category: string): number => {
  const categoryLower = category.toLowerCase();
  
  switch (categoryLower) {
    // Standardized categories (from categories table)
    case "laptop":
    case "laptops":
    case "ordinateur portable":
    case "pc portable":
      return 170;
    case "desktop":
    case "desktops":
    case "ordinateur fixe":
    case "pc fixe":
    case "ordinateur de bureau":
      return 170;
    case "smartphone":
    case "smartphones":
    case "téléphone":
    case "mobile":
      return 45;
    case "tablet":
    case "tablets":
    case "tablette":
    case "ipad":
    case "ipad m4": // Specific case for iPad M4
      return 87;
    case "monitor":
    case "monitors":
    case "écran":
    case "moniteur":
    case "display":
      return 85;
    case "printer":
    case "printers":
    case "imprimante":
      return 65;
    case "server":
    case "servers":
    case "serveur":
      return 300;
    case "accessory":
    case "accessories":
    case "accessoire":
    case "keyboard":
    case "clavier":
    case "mouse":
    case "souris":
    case "bureautique": // Office equipment
    case "software":
      return 15;
    case "other":
    case "autre":
      return 25; // Default for miscellaneous tech products
    default:
      // Log unrecognized categories for debugging
      if (category) {
        console.log(`PackCO2Calculator: Catégorie non reconnue: "${category}"`);
      }
      return 25; // Default value for unrecognized tech products
  }
};

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
}

const PackCO2SavingsCalculator: React.FC<PackCO2SavingsCalculatorProps> = ({ 
  items, 
  packQuantity 
}) => {
  // Calculate total CO2 savings for all items in the pack
  const totalSavings = items.reduce((total, item) => {
    // Use the standardized category first, then fallback to category_name
    const standardizedCategory = item.product?.category?.name || '';
    const fallbackCategory = item.product?.category_name || '';
    const category = standardizedCategory || fallbackCategory;
    const itemQuantity = item.quantity || 1;
    
    // Debug logging
    if (category) {
      console.log(`PackCO2Calculator: Item avec catégorie "${category}" (${standardizedCategory ? 'standardisée' : 'fallback'}), quantité: ${itemQuantity}, CO2: ${getCO2Savings(category)}kg`);
    }
    
    return total + (getCO2Savings(category) * itemQuantity * packQuantity);
  }, 0);

  // Debug logging for final result
  console.log(`PackCO2Calculator: Total des économies CO2: ${totalSavings}kg pour ${items.length} items avec pack quantity: ${packQuantity}`);

  // Show calculator even if savings are low to provide visibility
  if (totalSavings <= 0) {
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

  // Calculate equivalents (using same formulas as product calculator)
  const carKilometers = Math.round(totalSavings * 6); // ~6km per kg CO2
  const treeMonths = Math.round(totalSavings / 20); // ~20kg CO2 per tree per month

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0) * packQuantity;

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
      
      <div className="mb-2">
        <p className="text-gray-700 text-xs">
          Économie avec {totalItems} {totalItems > 1 ? "appareils" : "appareil"} reconditionné{totalItems > 1 ? "s" : ""} :
        </p>
      </div>
      
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="flex items-center bg-white bg-opacity-80 rounded-lg p-2 border border-[#4ab6c4]/20">
          <div className="flex-shrink-0 mr-1 text-sm">
            🍃
          </div>
          <div>
            <div className="text-sm font-bold text-[#33638e]">{totalSavings} kg</div>
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

export default PackCO2SavingsCalculator;