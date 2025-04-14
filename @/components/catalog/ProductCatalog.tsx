
import React from 'react';
import ProductCatalogGrid from './ProductCatalogGrid';
import UnifiedNavigation from '@/components/layout/UnifiedNavigation';

interface ProductCatalogProps {
  hideNavigation?: boolean;
}

const ProductCatalog = ({ hideNavigation = false }: ProductCatalogProps) => {
  return (
    <>
      {!hideNavigation && <UnifiedNavigation />}
      <div className="container mx-auto px-4 py-8">
        <ProductCatalogGrid />
      </div>
    </>
  );
};

export default ProductCatalog;
