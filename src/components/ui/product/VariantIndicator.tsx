
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Layers } from "lucide-react";

interface VariantIndicatorProps {
  hasVariants: boolean;
  variantsCount: number;
}

const VariantIndicator: React.FC<VariantIndicatorProps> = ({ hasVariants, variantsCount }) => {
  // Si le produit n'a pas de variantes ou si le compteur est à 0, ne rien afficher
  if (!hasVariants || variantsCount <= 0) {
    return null;
  }
  
  // Ajouter du logging pour déboguer
  console.log(`VariantIndicator: Showing ${variantsCount} existing variants`);
  
  // Afficher le badge avec le nombre exact de configurations de prix existantes
  return (
    <Badge className="rounded-full text-xs bg-indigo-100 text-indigo-800 flex items-center gap-1">
      <Layers className="h-3 w-3" />
      {variantsCount} {variantsCount > 1 ? "configurations" : "configuration"}
    </Badge>
  );
};

export default VariantIndicator;
