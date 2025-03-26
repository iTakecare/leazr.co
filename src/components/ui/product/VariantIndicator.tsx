
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Layers } from "lucide-react";

interface VariantIndicatorProps {
  hasVariants: boolean;
  variantsCount: number;
}

const VariantIndicator: React.FC<VariantIndicatorProps> = ({ hasVariants, variantsCount }) => {
  if (!hasVariants) return null;
  
  // Display the actual count if it's greater than 0, otherwise show '?'
  const displayCount = variantsCount > 0 ? variantsCount : '?';
  
  return (
    <Badge className="rounded-full text-xs bg-indigo-100 text-indigo-800">
      {displayCount}
    </Badge>
  );
};

export default VariantIndicator;
