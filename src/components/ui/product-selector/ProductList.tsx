
import React from "react";
import { Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductCard from "../ProductCard";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Product {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  description?: string;
  price: number;
  monthly_price?: number;
  image_url?: string;
  active: boolean;
  variants?: any[];
  is_parent?: boolean;
  variation_attributes?: Record<string, string[]>;
  attributes?: Record<string, any>;
  variant_combination_prices?: any[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface ProductListProps {
  filteredProducts: Product[];
  isLoading: boolean;
  error: any;
  handleProductSelect: (product: Product) => void;
  onViewVariants?: (product: Product, e: React.MouseEvent) => void;
}

const ProductList: React.FC<ProductListProps> = ({
  filteredProducts,
  isLoading,
  error,
  handleProductSelect,
  onViewVariants
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Chargement des produits...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-red-500">
        <p>Une erreur est survenue lors du chargement des produits.</p>
        <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
          Réessayer
        </Button>
      </div>
    );
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500 flex flex-col items-center">
        <Info className="h-12 w-12 text-gray-400 mb-2" />
        <p className="text-lg font-medium">Aucun produit trouvé</p>
        <p className="text-sm mt-1">Essayez de modifier vos critères de recherche</p>
      </div>
    );
  }

  return (
    <div className="p-4 h-full overflow-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6">
        {filteredProducts.map((product) => (
          <div key={product.id} className="cursor-pointer" onClick={() => handleProductSelect(product)}>
            <ProductCard 
              product={product as any} 
              onClick={() => handleProductSelect(product)}
              onViewVariants={onViewVariants ? (e) => onViewVariants(product, e) : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductList;
