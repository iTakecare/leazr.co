
import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import SimpleHeader from "@/components/catalog/public/SimpleHeader";
import ProductRequestForm from "@/components/catalog/public/ProductRequestForm";
import { useProductDetails } from "@/hooks/products/useProductDetails";
import ProductErrorState from "@/components/product-detail/ProductErrorState";
import ProductLoadingState from "@/components/product-detail/ProductLoadingState";
import ProductConfigurationSection from "@/components/product-detail/ProductConfigurationSection";
import ProductMainContent from "@/components/product-detail/ProductMainContent";
import RelatedProducts from "@/components/product-detail/RelatedProducts";
import { useAttributeHelpers } from "@/components/product-detail/ProductAttributeHelpers";
import { useCompanyDetection } from "@/hooks/useCompanyDetection";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useParams } from "react-router-dom";

const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Use company detection hook for slug support
  const { companyId, companySlug } = useCompanyDetection();
  
  // Fetch company info for branding
  const { data: company } = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      
      const { data, error } = await supabase
        .from("companies")
        .select("name, logo_url")
        .eq("id", companyId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
  
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
  } = useProductDetails(id);
  
  const attributeHelpers = useAttributeHelpers(
    specifications,
    variationAttributes,
    selectedOptions
  );
  
  const {
    getDisplayName,
    getConfigAttributes,
    getCurrentValue
  } = attributeHelpers;
  
  const handleBackToCatalog = () => {
    if (companySlug) {
      navigate(`/${companySlug}/catalog`);
    } else if (companyId) {
      navigate(`/public/${companyId}/catalog`);
    } else {
      navigate("/catalog/anonymous");
    }
  };
  
  if (isLoading) {
    return <ProductLoadingState companyId={companyId} companyLogo={company?.logo_url} companyName={company?.name} />;
  }
  
  if (error || !product) {
    return <ProductErrorState onBackToCatalog={handleBackToCatalog} companyId={companyId} companyLogo={company?.logo_url} companyName={company?.name} />;
  }
  
  const productName = product?.name || "Produit";
  const productCategory = product?.category || "Autre";
  const productBrand = product?.brand || "";
  const productDescription = product?.description || "Aucune description disponible pour ce produit.";
  
  const configAttributes = getConfigAttributes();
  
  // Construire l'URL de base du catalogue
  const catalogBaseUrl = companySlug 
    ? `/${companySlug}/catalog` 
    : companyId 
      ? `/public/${companyId}/catalog` 
      : "/catalog/anonymous";
  
  return (
    <div className="min-h-screen bg-white">
      <SimpleHeader companyId={companyId} companyLogo={company?.logo_url} companyName={company?.name} />
      
      <div className="container mx-auto px-4 max-w-[1320px] mb-16 pt-8">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBackToCatalog}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> 
              Retour au catalogue
            </Button>
          </div>
          
          <Breadcrumb className="mb-4">
            <BreadcrumbItem>
              <BreadcrumbLink href={catalogBaseUrl}>Catalogue</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink href={`${catalogBaseUrl}?category=${productCategory}`}>
                {productCategory}
              </BreadcrumbLink>
            </BreadcrumbItem>
            {productBrand && (
              <BreadcrumbItem>
                <BreadcrumbLink href={`${catalogBaseUrl}?brand=${productBrand}`}>
                  {productBrand}
                </BreadcrumbLink>
              </BreadcrumbItem>
            )}
            <BreadcrumbItem>
              <span>{productName}</span>
            </BreadcrumbItem>
          </Breadcrumb>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ProductMainContent 
            product={product}
            productName={productName}
            productDescription={productDescription}
            currentImage={currentImage}
            productBrand={productBrand}
          />
          
          <div>
            <ProductConfigurationSection 
              product={product}
              productCategory={productCategory}
              productName={productName}
              productBrand={productBrand}
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
              configAttributes={configAttributes}
              getCurrentValue={getCurrentValue}
              getDisplayName={getDisplayName}
            />
          </div>
        </div>
        
        <div className="mt-16 mb-24">
          <h2 className="text-2xl font-bold mb-6">Produits de la même marque que {productName}</h2>
          {companyId && (
            <RelatedProducts 
              companyId={companyId}
              category={productCategory} 
              currentProductId={product?.id} 
              brand={productBrand}
              limit={6}
            />
          )}
        </div>
      </div>
      
      <ProductRequestForm 
        isOpen={isRequestFormOpen}
        onClose={() => setIsRequestFormOpen(false)}
        product={selectedVariant || product}
        quantity={quantity}
        selectedOptions={selectedOptions}
        duration={duration}
        monthlyPrice={totalPrice}
      />
    </div>
  );
};

export default ProductDetailPage;
