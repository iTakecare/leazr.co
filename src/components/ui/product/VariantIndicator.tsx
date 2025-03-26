
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Layers } from "lucide-react";

interface VariantIndicatorProps {
  hasVariants: boolean;
  variantsCount: number;
}

const VariantIndicator: React.FC<VariantIndicatorProps> = ({ hasVariants, variantsCount }) => {
  if (!hasVariants) return null;
  
  // Display the actual count if it's available, otherwise don't show the badge
  if (variantsCount <= 0) {
    console.log("No variant count available for product with hasVariants=true");
    return null;
  }
  
  return (
    <Badge className="rounded-full text-xs bg-indigo-100 text-indigo-800">
      {variantsCount}
    </Badge>
  );
};

export default VariantIndicator;
