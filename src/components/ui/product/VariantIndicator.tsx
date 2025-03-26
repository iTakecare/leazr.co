
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Layers } from "lucide-react";

interface VariantIndicatorProps {
  hasVariants: boolean;
  variantsCount: number;
}

const VariantIndicator: React.FC<VariantIndicatorProps> = ({ hasVariants, variantsCount }) => {
  if (!hasVariants) return null;
  
  return (
    <Badge className="rounded-full text-xs bg-indigo-100 text-indigo-800 flex items-center gap-1">
      <Layers className="h-3 w-3" /> 
      {variantsCount}
    </Badge>
  );
};

export default VariantIndicator;
