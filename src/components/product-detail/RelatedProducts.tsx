import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getProductUpsells } from "@/services/catalogService";
import { Product } from "@/types/catalog";
import ProductGridCard from "@/components/catalog/public/ProductGridCard";
import { supabase } from "@/integrations/supabase/client";

interface RelatedProductsProps {
  companyId: string;
  category: string;
  currentProductId?: string;
  brand?: string;
  limit?: number;
  onProductSelect?: (productId: string) => void;
}

const RelatedProducts: React.FC<RelatedProductsProps> = ({ 
  companyId,
  category, 
  currentProductId,
  brand,
  limit = 3,
  onProductSelect
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [companySlug, setCompanySlug] = useState<string | null>(null);
  const navigate = useNavigate();

  // Get company slug from ID
  useEffect(() => {
    const fetchCompanySlug = async () => {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('slug')
          .eq('id', companyId)
          .single();
        
        if (error) throw error;
        setCompanySlug(data?.slug || null);
      } catch (error) {
        console.error('Error fetching company slug:', error);
      }
    };
    
    fetchCompanySlug();
  }, [companyId]);

  useEffect(() => {
    const loadRelatedProducts = async () => {
      if (!companySlug || !currentProductId) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const upsellProducts = await getProductUpsells(companySlug, currentProductId, limit);
        setProducts(upsellProducts);
      } catch (error) {
        console.error("Error loading upsell products:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRelatedProducts();
  }, [companySlug, currentProductId, limit]);

const handleProductClick = (productId: string) => {
  if (onProductSelect) {
    onProductSelect(productId);
  } else {
    navigate(`/produits/${productId}`);
  }
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
