
import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import PublicHeader from "@/components/catalog/public/PublicHeader";
import { Container } from "@/components/ui/container";
import ProductCatalogGrid from "@/components/catalog/ProductCatalogGrid";
import { Product } from "@/types/catalog";
import { getProducts } from "@/services/catalogService";
import { AlertCircle, Loader2 } from "lucide-react";

const PublicCatalog = () => {
  const location = useLocation();
  const isClientDashboard = location.pathname.startsWith('/client/');
  const [expandedVariantGroups, setExpandedVariantGroups] = useState<Record<string, boolean>>({});

  // Fetch products using React Query
  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ["public-catalog-products"],
    queryFn: () => getProducts(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Toggle variant group expansion
  const toggleVariantGroup = (productId: string) => {
    setExpandedVariantGroups(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  // Check if a variant group is expanded
  const isVariantGroupExpanded = (productId: string) => {
    return !!expandedVariantGroups[productId];
  };

  // Get product image with fallback
  const getProductImage = (product: Product) => {
    return product.image_url || "/placeholder.svg";
  };

  // Get variants for a product
  const getVariantsForProduct = (productId: string) => {
    return products.filter(product => product.parent_id === productId);
  };

  // Handle product selection
  const handleSelectProduct = (product: Product) => {
    console.log("Selected product:", product);
    // Implement navigation or modal display logic here
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        {!isClientDashboard && <PublicHeader />}
        <div className="pt-8 pb-16">
          <Container>
            <h1 className="text-2xl md:text-3xl font-bold mb-8">Catalogue Produits</h1>
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Chargement des produits...</span>
            </div>
          </Container>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="min-h-screen bg-white">
        {!isClientDashboard && <PublicHeader />}
        <div className="pt-8 pb-16">
          <Container>
            <h1 className="text-2xl md:text-3xl font-bold mb-8">Catalogue Produits</h1>
            <div className="flex flex-col items-center justify-center h-64 border rounded-md p-6">
              <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
              <p className="text-red-500 font-medium">Une erreur est survenue lors du chargement des produits.</p>
              <p className="text-sm text-gray-500 mt-2">Veuillez réessayer ultérieurement.</p>
            </div>
          </Container>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {!isClientDashboard && <PublicHeader />}
      <div className="pt-8 pb-16">
        <Container>
          <h1 className="text-2xl md:text-3xl font-bold mb-8">Catalogue Produits</h1>
          <ProductCatalogGrid 
            products={products}
            getProductImage={getProductImage}
            getVariantsForProduct={getVariantsForProduct}
            isVariantGroupExpanded={isVariantGroupExpanded}
            toggleVariantGroup={toggleVariantGroup}
            onSelectProduct={handleSelectProduct}
            hasVariantSupport={true}
            editMode={false}
          />
        </Container>
      </div>
    </div>
  );
};

export default PublicCatalog;
