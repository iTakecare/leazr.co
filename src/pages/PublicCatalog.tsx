
import React from 'react';
import ProductCatalog from '@/components/catalog/ProductCatalog';

const PublicCatalog = () => {
  return (
    <div className="h-full w-full overflow-auto">
      <ProductCatalog 
        hideNavigation={true} 
        isOpen={true} 
        useDialog={false} 
      />
    </div>
  );
};

export default PublicCatalog;
