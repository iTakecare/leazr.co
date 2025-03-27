
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getProductsByCategory } from "@/services/catalogService";
import { formatCurrency } from "@/utils/formatters";

interface RelatedProductsProps {
  category: string;
  currentProductId: string;
}

const RelatedProducts: React.FC<RelatedProductsProps> = ({ category, currentProductId }) => {
  const { data: products, isLoading, error } = useQuery({
    queryKey: ["products", { category }],
    queryFn: () => getProductsByCategory(category),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-100 animate-pulse h-64 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (error || !products || products.length === 0) {
    return null;
  }

  // Filter out the current product and limit to 4 related products
  const relatedProducts = products
    .filter(product => product.id !== currentProductId)
    .slice(0, 4);

  if (relatedProducts.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {relatedProducts.map((product) => (
        <Link 
          to={`/products/${product.id}`} 
          key={product.id}
          className="block bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
        >
          <div className="aspect-video p-4 flex items-center justify-center">
            <img 
              src={product.image_url || "/placeholder.svg"} 
              alt={product.name} 
              className="h-24 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
          </div>
          <div className="p-4 border-t">
            {product.brand && (
              <div className="text-xs text-gray-500 mb-1">{product.brand}</div>
            )}
            <h3 className="font-medium text-gray-900 mb-1 truncate">{product.name}</h3>
            <div className="text-indigo-600 font-semibold">
              {product.monthly_price ? `${formatCurrency(product.monthly_price)}/mois` : "Sur demande"}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default RelatedProducts;
