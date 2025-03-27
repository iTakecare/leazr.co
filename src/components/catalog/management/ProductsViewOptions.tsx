
import React from 'react';
import { Button } from '@/components/ui/button';
import { List, Grid3X3 } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useIsMobile } from '@/hooks/use-mobile';

interface ProductsViewOptionsProps {
  viewMode: 'grid' | 'accordion';
  groupingOption: 'model' | 'brand' | 'category';
  onViewModeChange: (viewMode: 'grid' | 'accordion') => void;
  onGroupingChange: (groupingOption: 'model' | 'brand' | 'category') => void;
}

const ProductsViewOptions: React.FC<ProductsViewOptionsProps> = ({
  viewMode,
  groupingOption,
  onViewModeChange,
  onGroupingChange
}) => {
  const isMobile = useIsMobile();
  
  const handleViewModeChange = (value: string) => {
    if (value === 'grid' || value === 'accordion') {
      onViewModeChange(value as 'grid' | 'accordion');
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3 mb-4">
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-md w-full sm:w-auto">
        <Button 
          variant={groupingOption === 'category' ? 'secondary' : 'ghost'} 
          size="sm"
          onClick={() => onGroupingChange('category')}
          className="rounded-md flex-1 sm:flex-initial"
        >
          Par catégorie
        </Button>
        <Button 
          variant={groupingOption === 'brand' ? 'secondary' : 'ghost'} 
          size="sm"
          onClick={() => onGroupingChange('brand')}
          className="rounded-md flex-1 sm:flex-initial"
        >
          Par marque
        </Button>
        <Button 
          variant={groupingOption === 'model' ? 'secondary' : 'ghost'} 
          size="sm"
          onClick={() => onGroupingChange('model')}
          className="rounded-md flex-1 sm:flex-initial"
        >
          Par modèle
        </Button>
      </div>
      
      <div className="flex items-center space-x-2 self-end">
        <ToggleGroup 
          type="single" 
          value={viewMode} 
          onValueChange={handleViewModeChange}
          className="bg-background"
        >
          <ToggleGroupItem value="accordion" aria-label="Voir en liste">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="grid" aria-label="Voir en grille">
            <Grid3X3 className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
};

export default ProductsViewOptions;
