
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, X } from 'lucide-react';

interface FilterProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilters: Record<string, boolean>;
  onStatusFilterChange: (status: string, checked: boolean) => void;
  locationFilters: Record<string, boolean>;
  onLocationFilterChange: (location: string, checked: boolean) => void;
  activeFiltersCount: number;
  onClearFilters: () => void;
}

const EquipmentFilter: React.FC<FilterProps> = ({
  searchQuery,
  onSearchChange,
  statusFilters,
  onStatusFilterChange,
  locationFilters,
  onLocationFilterChange,
  activeFiltersCount,
  onClearFilters
}) => {
  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Rechercher un équipement..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button 
            className="absolute right-3 top-2.5"
            onClick={() => onSearchChange('')}
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="font-medium">Statut</Label>
          {Object.values(statusFilters).some(Boolean) && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700"
              onClick={() => {
                Object.keys(statusFilters).forEach(status => 
                  onStatusFilterChange(status, false)
                );
              }}
            >
              Réinitialiser
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {Object.entries(statusFilters).map(([status, checked]) => (
            <div key={status} className="flex items-center space-x-2">
              <Checkbox 
                id={`status-${status}`} 
                checked={checked}
                onCheckedChange={(value) => onStatusFilterChange(status, !!value)}
              />
              <label 
                htmlFor={`status-${status}`} 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {status}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="font-medium">Emplacement</Label>
          {Object.values(locationFilters).some(Boolean) && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700"
              onClick={() => {
                Object.keys(locationFilters).forEach(location => 
                  onLocationFilterChange(location, false)
                );
              }}
            >
              Réinitialiser
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {Object.entries(locationFilters).map(([location, checked]) => (
            <div key={location} className="flex items-center space-x-2">
              <Checkbox 
                id={`location-${location}`} 
                checked={checked}
                onCheckedChange={(value) => onLocationFilterChange(location, !!value)}
              />
              <label 
                htmlFor={`location-${location}`} 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {location}
              </label>
            </div>
          ))}
        </div>
      </div>

      {activeFiltersCount > 0 && (
        <Button 
          variant="outline" 
          className="w-full text-sm"
          onClick={onClearFilters}
        >
          Effacer tous les filtres ({activeFiltersCount})
        </Button>
      )}
    </div>
  );
};

export default EquipmentFilter;
