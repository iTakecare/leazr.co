
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Product } from "@/types/catalog";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import CatalogProductCard from "@/components/ui/CatalogProductCard";

interface RelatedProductsProps {
  category?: string;
  brand?: string;
  currentProductId?: string;
  limit?: number;
  linkPrefix?: string;
}

// Helper function to get related products
const getRelatedProducts = async ({ 
  category, 
  brand, 
  excludeId, 
  limit = 4 
}: { 
  category?: string; 
  brand?: string; 
  excludeId?: string; 
  limit?: number;
}): Promise<Product[]> => {
  // This would normally call the API, but for now we'll return an empty array
  // as the actual implementation doesn't exist yet
  console.log(`Fetching related products - category: ${category}, brand: ${brand}, excludeId: ${excludeId}, limit: ${limit}`);
  return [];
};

const RelatedProducts: React.FC<RelatedProductsProps> = ({ 
  category, 
  brand, 
  currentProductId, 
  limit = 4,
  linkPrefix = "/products" 
}) => {
  const { data: relatedProducts = [], isLoading } = useQuery({
    queryKey: ["related-products", category, brand, currentProductId, limit],
    queryFn: () => getRelatedProducts({ category, brand, excludeId: currentProductId, limit }),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {Array(limit).fill(0).map((_, index) => (
          <Card key={index} className="h-full">
            <CardContent className="p-0">
              <div className="h-36 bg-gray-100 animate-pulse"></div>
              <div className="p-4">
                <div className="h-4 w-3/4 bg-gray-100 animate-pulse rounded mb-2"></div>
                <div className="h-4 w-1/2 bg-gray-100 animate-pulse rounded mb-4"></div>
                <div className="h-4 w-1/4 bg-gray-100 animate-pulse rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (relatedProducts.length === 0) {
    return null;
  }

  console.log(`RelatedProducts: Rendering ${relatedProducts.length} related products with linkPrefix: ${linkPrefix}`);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
      {relatedProducts.map((product) => (
        <Link key={product.id} to={`${linkPrefix}/${product.id}`} className="block h-full transition-transform hover:scale-[1.01]">
          <CatalogProductCard product={product} />
        </Link>
      ))}
    </div>
  );
};

export default RelatedProducts;
