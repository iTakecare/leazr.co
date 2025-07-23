import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import ProductRequestForm from "@/components/catalog/public/ProductRequestForm";
import { useProductDetails } from "@/hooks/products/useProductDetails";
import ProductErrorState from "@/components/product-detail/ProductErrorState";
import ProductLoadingState from "@/components/product-detail/ProductLoadingState";
import ProductConfigurationSection from "@/components/product-detail/ProductConfigurationSection";
import ProductMainContent from "@/components/product-detail/ProductMainContent";
import RelatedProducts from "@/components/product-detail/RelatedProducts";
import { useAttributeHelpers } from "@/components/product-detail/ProductAttributeHelpers";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";

const AmbassadorProductDetailPage: React.FC = () => {
  const { id: productId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Use the same hook as PublicProductDetail
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
    hasAttributeOptions,
    variationAttributes,
    getOptionsForAttribute
  } = useProductDetails(productId);
  
  const attributeHelpers = useAttributeHelpers(
    specifications,
    variationAttributes,
    selectedOptions
  );
  
  const {
    getDisplayName,
    getCurrentValue
  } = attributeHelpers;

  // Get config attributes from variation attributes
  const configAttributes = Object.keys(variationAttributes);

  // Fetch brand info
  const { data: brandInfo } = useQuery({
    queryKey: ['brand', product?.brand],
    queryFn: async () => {
      if (!product?.brand) return null;
      
      const { data, error } = await supabase
        .from('brands')
        .select('translation')
        .eq('name', product.brand)
        .single();
      
      if (error) return null;
      return data;
    },
    enabled: !!product?.brand,
  });

  const productName = product?.name || '';
  const productDescription = product?.description || '';
  const productBrand = brandInfo?.translation || product?.brand || '';
  const productCategory = product?.category || '';

  // Handle back navigation - simplified for ambassador context
  const handleBackToCatalog = () => {
    navigate('/ambassador/catalog');
  };

  if (isLoading) {
    return (
      <PageTransition>
        <Container className="max-w-[1320px] py-8">
          <ProductLoadingState />
        </Container>
      </PageTransition>
    );
  }

  if (error || !product) {
    return (
      <PageTransition>
        <Container className="max-w-[1320px] py-8">
          <ProductErrorState 
            onBackToCatalog={handleBackToCatalog}
          />
        </Container>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <Container className="py-6 max-w-[1320px]">
        {/* Breadcrumb Navigation */}
        <div className="mb-6 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBackToCatalog}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au catalogue
          </Button>
          
          <Breadcrumb>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={handleBackToCatalog}>
                Catalogue Ambassador
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <span>{productName}</span>
            </BreadcrumbItem>
          </Breadcrumb>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Product Images and Description */}
          <div className="space-y-6">
            <ProductMainContent
              product={product}
              productName={productName}
              productDescription={productDescription}
              currentImage={currentImage}
              productBrand={productBrand}
            />
          </div>

          {/* Right Column - Product Configuration */}
          <div className="space-y-6">
            <ProductConfigurationSection
              product={product}
              productBrand={productBrand}
              productCategory={productCategory}
              productName={productName}
              currentPrice={currentPrice}
              quantity={quantity}
              handleQuantityChange={handleQuantityChange}
              selectedOptions={selectedOptions}
              handleOptionChange={handleOptionChange}
              variationAttributes={variationAttributes}
              configAttributes={configAttributes}
              getDisplayName={getDisplayName}
              getCurrentValue={getCurrentValue}
              hasAttributeOptions={hasAttributeOptions}
              getOptionsForAttribute={getOptionsForAttribute}
              isOptionAvailable={isOptionAvailable}
              specifications={specifications}
              duration={duration}
              totalPrice={totalPrice}
              minMonthlyPrice={minMonthlyPrice}
            />
          </div>
        </div>

        {/* Related Products */}
        <div className="mt-16">
          <RelatedProducts 
            currentProductId={productId} 
            category={productCategory}
            brand={productBrand}
            limit={6}
          />
        </div>

        {/* Request Form Modal */}
        {isRequestFormOpen && (
          <ProductRequestForm
            isOpen={isRequestFormOpen}
            onClose={() => setIsRequestFormOpen(false)}
            product={product}
            quantity={quantity}
            selectedOptions={selectedOptions}
            duration={duration}
            monthlyPrice={currentPrice}
          />
        )}
      </Container>
    </PageTransition>
  );
};

export default AmbassadorProductDetailPage;