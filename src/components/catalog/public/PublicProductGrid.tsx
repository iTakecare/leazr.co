
import React from 'react';
import { Product } from '@/types/catalog';
import ProductGridCard from '@/components/catalog/public/ProductGridCard';
import { ArrowUpDown, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProductFilter } from '@/hooks/products/useProductFilter';

interface PublicProductGridProps {
  products: Product[];
  isLoading: boolean;
  onProductClick: (productId: string) => void;
  onToggleFilters: () => void;
  filterVisible: boolean;
}

const PublicProductGrid = ({ 
  products, 
  isLoading, 
  onProductClick,
  onToggleFilters,
  filterVisible
}: PublicProductGridProps) => {
  const { 
    selectedSort, 
    setSelectedSort,
    filteredProducts
  } = useProductFilter(products);

  const sortOptions = [
    { value: 'name-asc', label: 'Nom (A-Z)' },
    { value: 'name-desc', label: 'Nom (Z-A)' },
    { value: 'price-asc', label: 'Prix (croissant)' },
    { value: 'price-desc', label: 'Prix (décroissant)' },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-lg p-4 animate-pulse h-80">
            <div className="h-40 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onToggleFilters}
            className="mr-2 lg:hidden"
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            {filterVisible ? 'Masquer les filtres' : 'Afficher les filtres'}
          </Button>
          <span className="text-sm text-gray-500">
            {filteredProducts.length} produits trouvés
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 hidden sm:inline">Trier par</span>
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => {
                const currentIndex = sortOptions.findIndex(
                  opt => opt.value === selectedSort
                );
                const nextIndex = (currentIndex + 1) % sortOptions.length;
                setSelectedSort(sortOptions[nextIndex].value);
              }}
            >
              <span className="text-sm font-medium">
                {sortOptions.find(opt => opt.value === selectedSort)?.label}
              </span>
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="text-gray-500">Aucun produit ne correspond à votre recherche</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <ProductGridCard
              key={product.id}
              product={product}
              onClick={() => onProductClick(product.id || '')}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PublicProductGrid;
