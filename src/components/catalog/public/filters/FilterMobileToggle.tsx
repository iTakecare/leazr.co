
import React from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilterMobileToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  resultsCount: number;
}

const FilterMobileToggle: React.FC<FilterMobileToggleProps> = ({
  isOpen,
  onToggle,
  resultsCount,
}) => {
  return (
    <div className="lg:hidden flex items-center justify-between p-4 border-b bg-white">
      <div className="text-sm text-gray-600">
        {resultsCount} produit{resultsCount !== 1 ? 's' : ''} trouvé{resultsCount !== 1 ? 's' : ''}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className="flex items-center gap-2"
      >
        {isOpen ? <X className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
        {isOpen ? 'Fermer' : 'Filtres'}
      </Button>
    </div>
  );
};

export default FilterMobileToggle;
