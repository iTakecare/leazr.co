
import React from "react";
import { Badge } from "@/components/ui/badge";

interface ProductBadgesProps {
  category?: string;
  brand?: string;
}

const ProductBadges: React.FC<ProductBadgesProps> = ({ category, brand }) => {
  const getCategoryLabel = (category?: string) => {
    if (!category) return "Équipement";
    
    switch (category) {
      case "laptop": return "Ordinateur portable";
      case "desktop": return "Ordinateur fixe";
      case "tablet": return "Tablette";
      case "smartphone": return "Smartphone";
      case "monitor": return "Écran";
      case "printer": return "Imprimante";
      default: return "Équipement";
    }
  };
  
  return (
    <div className="flex items-center gap-2">
      <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200">
        {getCategoryLabel(category)}
      </Badge>
      {brand && <Badge variant="outline">{brand}</Badge>}
    </div>
  );
};

export default ProductBadges;
