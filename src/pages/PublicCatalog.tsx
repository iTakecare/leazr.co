
import React from 'react';
import { ProductCatalog } from '@/components/catalog/ProductCatalog';

const PublicCatalog = () => {
  return (
    <div className="h-full w-full overflow-auto">
      <ProductCatalog hideNavigation={true} />
    </div>
  );
};

export default PublicCatalog;
