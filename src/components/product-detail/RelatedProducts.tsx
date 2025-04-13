
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { getProducts } from "@/services/catalogService";
import { Product } from "@/types/catalog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/utils/formatters";

interface RelatedProductsProps {
  category: string;
  currentProductId?: string;
  limit?: number;
}

const RelatedProducts: React.FC<RelatedProductsProps> = ({ 
  category, 
  currentProductId,
  limit = 4
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadRelatedProducts = async () => {
      try {
        setIsLoading(true);
        const allProducts = await getProducts();
        
        const filteredProducts = allProducts
          .filter(p => p.category === category)
          .filter(p => p.id !== currentProductId)
          .filter(p => p.active !== false)
          .slice(0, limit);
        
        setProducts(filteredProducts);
      } catch (error) {
        console.error("Error loading related products:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (category) {
      loadRelatedProducts();
    }
  }, [category, currentProductId, limit]);

  const getProductPrice = (product: Product): number => {
    if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
      const variantPrices = product.variant_combination_prices
        .map(variant => variant.monthly_price || 0)
        .filter(price => price > 0);
      
      if (variantPrices.length > 0) {
        return Math.min(...variantPrices);
      }
    }
    
    if (typeof product.monthly_price === 'number' && product.monthly_price > 0) {
      return product.monthly_price;
    }
    
    return 39.99;
  };

  const handleProductClick = (productId: string) => {
    navigate(`/produits/${productId}`);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array(4).fill(0).map((_, index) => (
          <Card key={index} className="border-0 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Skeleton className="h-32 w-full" />
              <div className="p-3">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {products.map((product) => {
        const productPrice = getProductPrice(product);
        const hasVariants = product.variant_combination_prices && product.variant_combination_prices.length > 0;
        
        return (
          <Card 
            key={product.id} 
            className="border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => handleProductClick(product.id)}
          >
            <CardContent className="p-0">
              <div className="aspect-[4/3] relative overflow-hidden">
                <img 
                  src={product.image_url || "/placeholder.svg"} 
                  alt={product.name}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
              </div>
              <div className="p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-2">
                    <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 mb-1">
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-500">{product.brand}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-blue-700">
                      {hasVariants ? "Dès " : ""}
                      {formatCurrency(productPrice)}
                      <span className="text-xs text-gray-500">/mois</span>
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default RelatedProducts;
