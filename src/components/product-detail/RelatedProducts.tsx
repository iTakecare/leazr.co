
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/services/catalogService";
import { Card, CardContent } from "@/components/ui/card";
import { Product } from "@/types/catalog";
import { Link } from "react-router-dom";
import { formatCurrency } from "@/utils/formatters";

interface RelatedProductsProps {
  category: string;
  currentProductId: string;
}

const RelatedProducts: React.FC<RelatedProductsProps> = ({ category, currentProductId }) => {
  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts
  });
  
  if (isLoading || !products) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((index) => (
          <Card key={index} className="animate-pulse">
            <div className="h-48 bg-gray-200"></div>
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  // Filter related products by category, excluding current product
  const relatedProducts = products
    .filter(product => product.category === category && product.id !== currentProductId)
    .slice(0, 3);
  
  if (!relatedProducts.length) {
    return null;
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {relatedProducts.map((product: Product) => (
        <Link to={`/products/${product.id}`} key={product.id}>
          <Card className="h-full transition-shadow hover:shadow-md">
            <div className="aspect-video bg-white flex items-center justify-center p-4 border-b">
              <img 
                src={product.image_url || "/placeholder.svg"} 
                alt={product.name}
                className="h-40 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder.svg";
                }}
              />
            </div>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">{product.brand}</div>
              <h3 className="font-semibold truncate">{product.name}</h3>
              <div className="mt-2 text-gray-700">
                dès {formatCurrency(product.monthly_price || 0)} par mois
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
};

export default RelatedProducts;
