
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import Container from '@/components/layout/Container';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from '@/components/ui/breadcrumb';
import SimpleHeader from '@/components/catalog/public/SimpleHeader';
import ProductRequestForm from '@/components/catalog/public/ProductRequestForm';
import ProductErrorState from '@/components/product-detail/ProductErrorState';
import ProductLoadingState from '@/components/product-detail/ProductLoadingState';
import ProductConfigurationSection from '@/components/product-detail/ProductConfigurationSection';
import ProductMainContent from '@/components/product-detail/ProductMainContent';
import RelatedProducts from '@/components/product-detail/RelatedProducts';
import { useAttributeHelpers } from '@/components/product-detail/ProductAttributeHelpers';
import { usePublicProductDetails } from '@/hooks/products/usePublicProductDetails';

const PublicSlugProductDetails = () => {
  const { companySlug, productId } = useParams<{ companySlug: string; productId: string }>();
  const navigate = useNavigate();
  
  console.log('🏪 PUBLIC SLUG PRODUCT - Component rendered with:', { companySlug, productId });
  
  // Fetch company by slug
  const { data: company, isLoading: isLoadingCompany, error: companyError } = useQuery({
    queryKey: ['company-by-slug', companySlug],
    queryFn: async () => {
      if (!companySlug) return null;
      
      const { data, error } = await supabase
        .rpc('get_company_by_slug', { company_slug: companySlug });
      
      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!companySlug,
  });

  // Use public product details hook
  const {
    product,
    isLoading: isLoadingProduct,
    error: productError,
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
  } = usePublicProductDetails(productId, company?.id);
  
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
    navigate(`/${companySlug}/catalog`);
  };

  // Loading state
  if (isLoadingCompany || isLoadingProduct) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </Container>
    );
  }

  // Error or not found
  if (companyError || !company) {
    return (
      <Container>
        <Alert variant="destructive" className="max-w-lg mx-auto mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Entreprise non trouvée pour le slug: {companySlug}
          </AlertDescription>
        </Alert>
      </Container>
    );
  }

  if (productError || !product) {
    return (
      <div className="min-h-screen bg-white">
        <SimpleHeader companyId={company.id} companyLogo={company.logo_url} companyName={company.name} />
        <Container>
          <Alert variant="destructive" className="max-w-lg mx-auto mt-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Produit non trouvé ou non disponible publiquement.
            </AlertDescription>
          </Alert>
        </Container>
      </div>
    );
  }

  const productName = product?.name || "Produit";
  const productCategory = product?.category || "Autre";
  const productBrand = product?.brand || "";
  const productDescription = product?.description || "Aucune description disponible pour ce produit.";
  
  const configAttributes = getConfigAttributes();
  
  // Construire l'URL de base du catalogue
  const catalogBaseUrl = `/${companySlug}/catalog`;

  return (
    <div className="min-h-screen bg-white">
      <SimpleHeader companyId={company.id} companyLogo={company.logo_url} companyName={company.name} />
      
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
          <RelatedProducts 
            category={productCategory} 
            currentProductId={product?.id} 
            brand={productBrand}
            limit={6}
          />
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

export default PublicSlugProductDetails;
