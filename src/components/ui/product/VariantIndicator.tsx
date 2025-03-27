
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Layers } from "lucide-react";

interface VariantIndicatorProps {
  hasVariants: boolean;
  variantsCount: number;
  className?: string;
}

const VariantIndicator: React.FC<VariantIndicatorProps> = ({ 
  hasVariants, 
  variantsCount,
  className = ""
}) => {
  // Si le produit n'a pas de variantes ou si le compteur est à 0, ne rien afficher
  if (!hasVariants || variantsCount <= 0) {
    return null;
  }
  
  // Afficher le badge avec le nombre exact de configurations de prix existantes
  return (
    <Badge className={`rounded-full text-xs bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border-0 flex items-center gap-1 ${className}`}>
      <Layers className="h-3 w-3" />
      {variantsCount} configuration{variantsCount > 1 ? 's' : ''}
    </Badge>
  );
};

export default VariantIndicator;
