import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ShoppingCart, Phone, Mail, MapPin, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { supabase } from "@/integrations/supabase/client";
import { useProductDetails } from "@/hooks/products/useProductDetails";
import ProductErrorState from "@/components/product-detail/ProductErrorState";
import ProductLoadingState from "@/components/product-detail/ProductLoadingState";
import ProductConfigurationSection from "@/components/product-detail/ProductConfigurationSection";
import ProductMainContent from "@/components/product-detail/ProductMainContent";
import RelatedProducts from "@/components/product-detail/RelatedProducts";
import { useAttributeHelpers } from "@/components/product-detail/ProductAttributeHelpers";
import CompanyCustomizationService, { CompanyBranding } from "@/services/companyCustomizationService";
import { useCart } from "@/context/CartContext";

const PublicProductDetailPage = () => {
  const { companyId, id } = useParams<{ companyId: string; id: string }>();
  const navigate = useNavigate();
  const { cartCount } = useCart();
  
  // Fetch company info with branding
  const { data: company } = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .single();
      if (error) throw error;
      
      // Apply company branding
      if (data && (data.primary_color || data.secondary_color || data.accent_color)) {
        CompanyCustomizationService.applyCompanyBranding({
          company_id: companyId,
          primary_color: data.primary_color || "#3b82f6",
          secondary_color: data.secondary_color || "#64748b",
          accent_color: data.accent_color || "#8b5cf6",
          logo_url: data.logo_url || ""
        });
      }
      
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
    navigate(`/catalog/anonymous/${companyId}`);
  };
  
  const handleCartClick = () => {
    navigate(`/public/${companyId}/panier`);
  };
  
  if (isLoading) {
    return <ProductLoadingState />;
  }
  
  if (error || !product) {
    return <ProductErrorState onBackToCatalog={handleBackToCatalog} />;
  }
  
  const productName = product?.name || "Produit";
  const productCategory = product?.category || "Autre";
  const productBrand = product?.brand || "";
  const productDescription = product?.description || "Aucune description disponible pour ce produit.";
  
  const configAttributes = getConfigAttributes();
  
  return (
    <div className="min-h-screen bg-white">
      {/* Company Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {company?.logo_url && (
                <img 
                  src={company.logo_url} 
                  alt={company.name}
                  className="h-10 w-auto"
                />
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900">{company?.name || "Catalogue"}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  {company?.contact_phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      <span>{company.contact_phone}</span>
                    </div>
                  )}
                  {company?.contact_email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <span>{company.contact_email}</span>
                    </div>
                  )}
                  {company?.website_url && (
                    <div className="flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      <a 
                        href={company.website_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-primary"
                      >
                        Site web
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={handleBackToCatalog}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Catalogue
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleCartClick}
                className="relative flex items-center gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                Panier
                {cartCount > 0 && (
                  <Badge 
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {cartCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-4 max-w-[1320px] py-8">
        <div className="mb-6">
          <Breadcrumb className="mb-4">
            <BreadcrumbItem>
              <BreadcrumbLink href={`/public/${companyId}/catalog`}>Catalogue</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/public/${companyId}/catalog?category=${productCategory}`}>
                {productCategory}
              </BreadcrumbLink>
            </BreadcrumbItem>
            {productBrand && (
              <BreadcrumbItem>
                <BreadcrumbLink href={`/public/${companyId}/catalog?brand=${productBrand}`}>
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
        
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Produits de la même marque que {productName}</h2>
          <RelatedProducts 
            category={productCategory} 
            currentProductId={product?.id} 
            brand={productBrand}
            limit={6}
          />
        </div>
      </div>
      
      {/* Company Footer */}
      <footer className="bg-gray-50 border-t mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                {company?.logo_url && (
                  <img 
                    src={company.logo_url} 
                    alt={company.name}
                    className="h-8 w-auto"
                  />
                )}
                <h3 className="text-lg font-semibold">{company?.name}</h3>
              </div>
              {company?.description && (
                <p className="text-gray-600 text-sm">{company.description}</p>
              )}
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Contact</h4>
              <div className="space-y-2 text-sm text-gray-600">
                {company?.contact_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{company.contact_phone}</span>
                  </div>
                )}
                {company?.contact_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{company.contact_email}</span>
                  </div>
                )}
                {company?.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{company.address}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Navigation</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <a 
                    href={`/public/${companyId}/catalog`}
                    className="text-gray-600 hover:text-primary"
                  >
                    Catalogue
                  </a>
                </div>
                {company?.website_url && (
                  <div>
                    <a 
                      href={company.website_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-primary flex items-center gap-1"
                    >
                      Site web <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="border-t pt-6 mt-6 text-center text-sm text-gray-500">
            <p>© {new Date().getFullYear()} {company?.name}. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicProductDetailPage;
