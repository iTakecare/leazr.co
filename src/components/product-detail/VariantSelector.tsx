
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Info } from "lucide-react";
import { ProductVariationAttributes } from "@/types/catalog";

interface VariantSelectorProps {
  variationAttributes: ProductVariationAttributes;
  selectedOptions: Record<string, string>;
  onOptionChange: (optionName: string, value: string) => void;
  isOptionAvailable: (optionName: string, value: string) => boolean;
  hasVariants: boolean;
  hasOptions: boolean;
}

const VariantSelector: React.FC<VariantSelectorProps> = ({
  variationAttributes,
  selectedOptions,
  onOptionChange,
  isOptionAvailable,
  hasVariants,
  hasOptions
}) => {
  // Fonction pour organiser les options par groupes
  const getGroupedAttributes = () => {
    // Trier les attributs par priorité
    const priorityOrder = [
      "condition", "etat", 
      "screen_size", "taille_ecran", 
      "processor", "processeur", 
      "stockage", "storage", 
      "memory", "ram", 
      "graphics_card", "carte_graphique", 
      "network", "reseau", 
      "keyboard", "clavier"
    ];
    
    // Convertir les attributs en tableau pour le tri
    const attributesArray = Object.entries(variationAttributes || {});
    
    // Trier les attributs selon l'ordre de priorité
    attributesArray.sort(([keyA], [keyB]) => {
      const indexA = priorityOrder.indexOf(keyA.toLowerCase());
      const indexB = priorityOrder.indexOf(keyB.toLowerCase());
      
      // Si l'attribut n'est pas dans la liste de priorité, lui donner un indice élevé
      const valueA = indexA === -1 ? 999 : indexA;
      const valueB = indexB === -1 ? 999 : indexB;
      
      return valueA - valueB;
    });
    
    console.log("Grouped attributes:", attributesArray);
    return attributesArray;
  };

  const checkIsOptionAvailable = (optionName: string, value: string): boolean => {
    // Appel de la fonction isOptionAvailable avec les deux paramètres requis
    return isOptionAvailable(optionName, value);
  };

  if (!hasVariants) {
    return (
      <div className="text-gray-500 text-xs">Aucune option de configuration disponible pour ce produit.</div>
    );
  }
  
  if (hasVariants && !hasOptions) {
    return (
      <div className="text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200 text-xs">
        <p className="flex items-center">
          <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
          Ce produit a des variantes, mais aucune option de configuration n'a pu être récupérée.
        </p>
      </div>
    );
  }
  
  const groupedAttributes = getGroupedAttributes();
  
  if (groupedAttributes.length === 0) {
    return (
      <div className="text-blue-600 bg-blue-50 p-2 rounded-lg border border-blue-200 text-xs">
        <p className="flex items-center">
          <Info className="h-3.5 w-3.5 mr-1.5" />
          Aucune option de variation n'est disponible actuellement.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {groupedAttributes.map(([option, values]) => (
        <div key={option} className="rounded-md border border-gray-200 p-2 bg-white shadow-sm">
          <label className="block text-xs font-medium text-gray-700 capitalize mb-1.5">
            {option}
          </label>
          <div className="flex flex-wrap gap-1">
            {values.map((value) => {
              const isAvailable = checkIsOptionAvailable(option, value);
              const isSelected = selectedOptions[option] === value;
              
              return (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={isSelected ? "default" : "outline"}
                  className={`
                    ${isSelected ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                    ${!isAvailable ? "opacity-50 cursor-not-allowed" : ""}
                    text-xs h-6 px-2 py-0
                  `}
                  onClick={() => isAvailable && onOptionChange(option, value)}
                  disabled={!isAvailable}
                >
                  {value}
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default VariantSelector;
