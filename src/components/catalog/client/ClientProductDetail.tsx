
import React from "react";
import { useNavigate } from "react-router-dom";
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

interface ClientProductDetailProps {
  id?: string;
}

const ClientProductDetail = ({ id: propId }: ClientProductDetailProps) => {
  const navigate = useNavigate();
  
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
  } = useProductDetails(propId);
  
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
    navigate("/client/catalog");
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
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b border-gray-100">
        <Button variant="ghost" className="mb-4" onClick={handleBackToCatalog}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour au catalogue
        </Button>
        
        <Breadcrumb className="mb-4">
          <BreadcrumbItem>
            <BreadcrumbLink onClick={handleBackToCatalog}>Catalogue</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink>{productCategory}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <BreadcrumbLink>{productName}</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
      </div>
      
      <div className="p-6">
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
        
        <div className="mt-16 mb-8">
          <h2 className="text-2xl font-bold mb-6">Produits similaires</h2>
          <RelatedProducts 
            category={productCategory} 
            currentProductId={product?.id} 
            brand={productBrand}
            limit={4}
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

export default ClientProductDetail;
