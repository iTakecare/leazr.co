
import React from 'react';
import ProductCatalog from '@/components/catalog/ProductCatalog';
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/services/catalogService";
import ProductGridCard from '@/components/catalog/public/ProductGridCard';
import { useNavigate } from "react-router-dom";

const PublicCatalog = () => {
  const navigate = useNavigate();
  
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products-catalog"],
    queryFn: () => getProducts(),
  });

  const handleProductClick = (productId: string) => {
    navigate(`/products/${productId}`);
  };

  return (
    <div className="h-full w-full overflow-auto">
      <ProductCatalog 
        hideNavigation={true} 
        isOpen={true} 
        useDialog={false} 
      />
    </div>
  );
};

export default PublicCatalog;
