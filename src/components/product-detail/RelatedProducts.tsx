
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { getRelatedProducts } from "@/services/catalogServiceOptimized";
import { Product } from "@/types/catalog";
import ProductGridCard from "@/components/catalog/public/ProductGridCard";

interface RelatedProductsProps {
  companyId: string;
  category: string;
  currentProductId?: string;
  brand?: string;
  limit?: number;
}

const RelatedProducts: React.FC<RelatedProductsProps> = ({ 
  companyId,
  category, 
  currentProductId,
  brand,
  limit = 3
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadRelatedProducts = async () => {
      try {
        setIsLoading(true);
        const relatedProducts = await getRelatedProducts(
          companyId, 
          category, 
          brand, 
          currentProductId, 
          limit
        );
        
        setProducts(relatedProducts);
      } catch (error) {
        console.error("Error loading related products:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (companyId && (category || brand)) {
      loadRelatedProducts();
    }
  }, [companyId, category, currentProductId, brand, limit]);

  const handleProductClick = (productId: string) => {
    navigate(`/produits/${productId}`);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {Array(limit).fill(0).map((_, index) => (
          <div key={index} className="h-[350px] bg-gray-100 animate-pulse rounded-xl">
            <div className="h-[180px] bg-gray-200 w-full rounded-t-xl"></div>
            <div className="p-3">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="flex gap-1 mb-2">
                <div className="h-5 w-20 bg-gray-200 rounded-full"></div>
                <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mt-4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {products.map((product) => (
        <ProductGridCard 
          key={product.id}
          product={product}
          onClick={() => handleProductClick(product.id)}
        />
      ))}
    </div>
  );
};

export default RelatedProducts;
