
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
        // Use the getProducts function instead of the non-existent getProductsByCategory
        const allProducts = await getProducts();
        
        // Filter products by category and other criteria
        const filteredProducts = allProducts
          .filter(p => p.category === category) // Filter by matching category
          .filter(p => p.id !== currentProductId) // Filter out current product
          .filter(p => p.active !== false) // Filter only active products
          .slice(0, limit); // Limit the number of products
        
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

  // Calculate the correct price to display for a product
  const getProductPrice = (product: Product): number => {
    // If the product has variants, find the minimum price
    if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
      const variantPrices = product.variant_combination_prices
        .map(variant => variant.monthly_price || 0)
        .filter(price => price > 0);
      
      if (variantPrices.length > 0) {
        return Math.min(...variantPrices);
      }
    }
    
    // Use monthly_price if available
    if (typeof product.monthly_price === 'number' && product.monthly_price > 0) {
      return product.monthly_price;
    }
    
    // Fallback to a default value if nothing else works
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
            className="border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleProductClick(product.id)}
          >
            <CardContent className="p-0">
              <div className="aspect-[4/3] relative">
                <img 
                  src={product.image_url || "/placeholder.svg"} 
                  alt={product.name}
                  className="w-full h-full object-cover object-center"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
              </div>
              <div className="p-3">
                <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mb-1">{product.name}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{product.brand}</span>
                  <span className="text-sm font-semibold text-[#2d618f]">
                    {hasVariants ? "À partir de " : ""}
                    {formatCurrency(productPrice)}/mois
                  </span>
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
