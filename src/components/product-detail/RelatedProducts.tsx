
import React from 'react';

interface RelatedProductsProps {
  category?: string;
  currentProductId: string;
}

const RelatedProducts: React.FC<RelatedProductsProps> = ({ category, currentProductId }) => {
  // Implement related products functionality here when needed
  
  return (
    <div className="mt-16 mb-16">
      <h2 className="text-2xl font-bold mb-6">Produits similaires</h2>
      <div className="text-center py-12 border rounded-xl bg-gray-50">
        <p className="text-gray-500">Les produits similaires seront affichés ici.</p>
      </div>
    </div>
  );
};

export default RelatedProducts;
