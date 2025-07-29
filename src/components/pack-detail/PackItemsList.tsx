import React from "react";
import { ProductPackItem } from "@/types/pack";

interface PackItemsListProps {
  items: ProductPackItem[];
}

const PackItemsList: React.FC<PackItemsListProps> = ({ items }) => {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="my-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Produits inclus dans ce pack</h2>
      
      <div className="bg-gray-50 rounded-xl p-6">
        <div className="grid gap-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-4">
                {/* Product Image */}
                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {item.product?.image_url ? (
                    <img
                      src={item.product.image_url}
                      alt={item.product?.name || 'Produit'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <span className="text-xs text-gray-400">N/A</span>
                    </div>
                  )}
                </div>
                
                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {item.product?.name || 'Produit sans nom'}
                      </h3>
                      
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                        {item.product?.brand_name && (
                          <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                            {item.product.brand_name}
                          </span>
                        )}
                        {item.product?.category_name && (
                          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                            {item.product.category_name}
                          </span>
                        )}
                      </div>
                      
                      {/* Variant Attributes */}
                      {item.variant_price?.attributes && Object.keys(item.variant_price.attributes).length > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                          {Object.entries(item.variant_price.attributes).map(([key, value]) => (
                            <span key={key} className="mr-3">
                              <span className="font-medium">{key}:</span> {value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right ml-4">
                      <div className="text-lg font-bold text-[#33638e]">
                        ×{item.quantity}
                      </div>
                      {item.unit_monthly_price > 0 && (
                        <div className="text-xs text-gray-500">
                          {item.unit_monthly_price.toFixed(2)}€/mois
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            <span className="font-medium">{items.length}</span> produit{items.length > 1 ? 's' : ''} 
            {' '}inclus dans ce pack reconditionné
          </p>
        </div>
      </div>
    </div>
  );
};

export default PackItemsList;