
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Filter as FilterIcon, ChevronDown } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FilterOption {
  id: string;
  label: string;
  checked: boolean;
}

interface EquipmentFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilters: FilterOption[];
  onStatusFilterChange: (id: string) => void;
  locationFilters?: FilterOption[];
  onLocationFilterChange?: (id: string) => void;
  activeFiltersCount: number;
  onClearFilters: () => void;
}

const EquipmentFilter: React.FC<EquipmentFilterProps> = ({
  searchQuery,
  onSearchChange,
  statusFilters,
  onStatusFilterChange,
  locationFilters = [],
  onLocationFilterChange,
  activeFiltersCount,
  onClearFilters,
}) => {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 h-10"
        >
          <FilterIcon size={16} />
          <span>Filtrer</span>
          {activeFiltersCount > 0 && (
            <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs">
              {activeFiltersCount}
            </span>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-2 h-10">
              <span>Trier par</span>
              <ChevronDown size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Trier par</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuCheckboxItem checked={true}>
                Nom (A-Z)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem>
                Nom (Z-A)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem>
                Date d'ajout (récent)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem>
                Date d'ajout (ancien)
              </DropdownMenuCheckboxItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-grow">
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tapez le nom d'un appareil"
          className="h-10"
        />
      </div>
    </div>
  );
};

export default EquipmentFilter;
