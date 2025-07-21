
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";

interface SortFilterProps {
  sortBy: 'name' | 'price' | 'brand' | 'newest';
  sortOrder: 'asc' | 'desc';
  onSortByChange: (sortBy: 'name' | 'price' | 'brand' | 'newest') => void;
  onSortOrderChange: (sortOrder: 'asc' | 'desc') => void;
}

const SortFilter: React.FC<SortFilterProps> = ({
  sortBy,
  sortOrder,
  onSortByChange,
  onSortOrderChange
}) => {
  const sortOptions = [
    { value: 'newest', label: 'Plus récents' },
    { value: 'name', label: 'Nom' },
    { value: 'price', label: 'Prix' },
    { value: 'brand', label: 'Marque' }
  ];

  const handleSortChange = (value: string) => {
    onSortByChange(value as typeof sortBy);
  };

  const toggleSortOrder = () => {
    onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="flex items-center space-x-2">
      <Select value={sortBy} onValueChange={handleSortChange}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <button
        onClick={toggleSortOrder}
        className="p-2 rounded border hover:bg-muted transition-colors"
        title={sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
      >
        <ArrowUpDown className={`h-4 w-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );
};

export default SortFilter;
