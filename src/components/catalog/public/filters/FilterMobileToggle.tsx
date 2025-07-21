
import React from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FilterMobileToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  filterCount: number;
}

const FilterMobileToggle: React.FC<FilterMobileToggleProps> = ({
  isOpen,
  onToggle,
  filterCount
}) => {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onToggle}
      className="relative lg:hidden"
    >
      {isOpen ? <X className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
      <span className="ml-2">Filtres</span>
      {filterCount > 0 && (
        <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
          {filterCount}
        </Badge>
      )}
    </Button>
  );
};

export default FilterMobileToggle;
