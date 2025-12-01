
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export type InvoiceSortBy = 'invoice_date' | 'amount' | 'client' | 'status' | 'invoice_number';

interface InvoiceSortFilterProps {
  sortBy: InvoiceSortBy;
  sortOrder: 'asc' | 'desc';
  onSortByChange: (sortBy: InvoiceSortBy) => void;
  onSortOrderChange: (sortOrder: 'asc' | 'desc') => void;
}

const InvoiceSortFilter: React.FC<InvoiceSortFilterProps> = ({
  sortBy,
  sortOrder,
  onSortByChange,
  onSortOrderChange
}) => {
  const sortOptions = [
    { value: 'invoice_date', label: 'Date de facture' },
    { value: 'amount', label: 'Montant' },
    { value: 'client', label: 'Client' },
    { value: 'status', label: 'Statut' },
    { value: 'invoice_number', label: 'Numéro' }
  ];

  const handleSortChange = (value: string) => {
    onSortByChange(value as InvoiceSortBy);
  };

  const toggleSortOrder = () => {
    onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="flex items-center space-x-2">
      <Select value={sortBy} onValueChange={handleSortChange}>
        <SelectTrigger className="w-44">
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
      
      <Button
        variant="outline"
        size="icon"
        onClick={toggleSortOrder}
        title={sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
      >
        <ArrowUpDown className={`h-4 w-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
      </Button>
    </div>
  );
};

export default InvoiceSortFilter;
