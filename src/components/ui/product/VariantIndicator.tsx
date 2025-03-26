
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Layers } from "lucide-react";

interface VariantIndicatorProps {
  hasVariants: boolean;
  variantsCount: number;
}

const VariantIndicator: React.FC<VariantIndicatorProps> = ({ hasVariants, variantsCount }) => {
  // Ne rien afficher si le produit n'a pas de variantes
  if (!hasVariants) return null;
  
  // N'afficher le badge que si le nombre de variantes est positif
  if (variantsCount <= 0) return null;
  
  return (
    <Badge className="rounded-full text-xs bg-indigo-100 text-indigo-800">
      {variantsCount} {variantsCount > 1 ? "variantes" : "variante"}
    </Badge>
  );
};

export default VariantIndicator;
