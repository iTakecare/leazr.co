import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProductDetails } from '@/hooks/products/useProductDetails';
import ProductErrorState from "@/components/product-detail/ProductErrorState";
import ProductLoadingState from "@/components/product-detail/ProductLoadingState";
import ProductConfigurationSection from "@/components/product-detail/ProductConfigurationSection";
import ProductMainContent from "@/components/product-detail/ProductMainContent";
import RelatedProducts from "@/components/product-detail/RelatedProducts";
import { useAttributeHelpers } from "@/components/product-detail/ProductAttributeHelpers";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InlinePublicProductDetailProps {
  companyId: string;
  companySlug: string;
  productId: string;
  company: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
  };
  onBackToCatalog: () => void;
  onProductSelect?: (productId: string) => void;
}

const InlinePublicProductDetail: React.FC<InlinePublicProductDetailProps> = ({
  companyId,
  companySlug,
  productId,
  company,
  onBackToCatalog,
  onProductSelect
}) => {
  // Use the same hook as ProductDetailPage
  const {
    product,
    isLoading,
    error,
    quantity,
    handleQuantityChange,
    isRequestFormOpen,
    setIsRequestFormOpen,
    selectedOptions,
    handleOptionChange,
    isOptionAvailable,
    currentImage,
    currentPrice,
    selectedVariant,
    duration,
    totalPrice,
    minMonthlyPrice,
    specifications,
    hasVariants,
    hasOptions,
    variationAttributes,
    hasAttributeOptions,
    getOptionsForAttribute
  } = useProductDetails(productId);

  // Initialize attribute helpers with current data
  const attributeHelpers = useAttributeHelpers(
    product?.specifications || {},
    product?.variation_attributes || {},
    selectedOptions
  );

  // Fetch brand information for the product
  const { data: brandData } = useQuery({
    queryKey: ['brand', product?.brand],
    queryFn: async () => {
      if (!product?.brand) return null;
      
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('name', product.brand)
        .single();
      
      if (error) {
        console.error('Error fetching brand:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!product?.brand,
  });

  // Extract helper functions
  const { getDisplayName, getConfigAttributes, getCurrentValue } = attributeHelpers;

  if (isLoading) {
    return <ProductLoadingState />;
  }

  if (error || !product) {
    return (
      <ProductErrorState 
        onBackToCatalog={onBackToCatalog}
        companyId={companyId}
        companyLogo={company.logo_url}
        companyName={company.name}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Back to catalog button */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={onBackToCatalog}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au catalogue
        </Button>
        
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-muted-foreground">
          <span className="cursor-pointer hover:text-foreground" onClick={onBackToCatalog}>
            Catalogue
          </span>
          <span className="mx-2">/</span>
          <span>{product.name}</span>
        </nav>
      </div>

      {/* Product details - Compact 3-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left columns (2/3) - Product images and description */}
        <div className="lg:col-span-2">
          <ProductMainContent
            product={product}
            productName={product.name}
            productDescription={product.description || ''}
            currentImage={currentImage}
            productBrand={product.brand || ''}
            companyId={companyId}
          />
        </div>

        {/* Right column (1/3) - Configuration and pricing */}
        <div className="lg:col-span-1">
          <ProductConfigurationSection
            product={product}
            productCategory={product.category || ''}
            productName={product.name}
            productBrand={product.brand || ''}
            currentPrice={currentPrice}
            minMonthlyPrice={minMonthlyPrice}
            totalPrice={totalPrice}
            quantity={quantity}
            duration={duration}
            handleQuantityChange={handleQuantityChange}
            selectedOptions={selectedOptions}
            handleOptionChange={handleOptionChange}
            isOptionAvailable={isOptionAvailable}
            variationAttributes={variationAttributes}
            specifications={specifications}
            hasAttributeOptions={hasAttributeOptions}
            getOptionsForAttribute={getOptionsForAttribute}
            configAttributes={getConfigAttributes()}
            getCurrentValue={getCurrentValue}
            getDisplayName={getDisplayName}
          />
        </div>
      </div>

      {/* Related Products */}
<RelatedProducts
        companyId={companyId}
        category={product.category}
        currentProductId={product.id}
        brand={product.brand}
        limit={4}
        onProductSelect={onProductSelect}
      />
    </div>
  );
};

export default InlinePublicProductDetail;