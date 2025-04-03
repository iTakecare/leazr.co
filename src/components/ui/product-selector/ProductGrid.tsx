
import React from "react";
import { Product } from "@/types/catalog";
import CatalogProductCard from "@/components/ui/CatalogProductCard";
import ProductLoadingState from "./ProductLoadingState";
import ProductErrorState from "./ProductErrorState";
import NoProductsFound from "./NoProductsFound";

interface ProductGridProps {
  products: Product[];
  isLoading: boolean;
  error: any;
  onProductClick: (product: Product) => void;
  onViewVariants?: (product: Product, e: React.MouseEvent) => void;
}

const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  isLoading,
  error,
  onProductClick,
  onViewVariants
}) => {
  if (isLoading) {
    return <ProductLoadingState />;
  }

  if (error) {
    return <ProductErrorState />;
  }

  if (products.length === 0) {
    return <NoProductsFound />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {products.map((product) => (
        <div key={product.id} className="cursor-pointer">
          <CatalogProductCard 
            product={product} 
            onClick={() => onProductClick(product)}
            onViewVariants={onViewVariants ? (e) => onViewVariants(product, e) : undefined}
          />
        </div>
      ))}
    </div>
  );
};

export default ProductGrid;
