
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProductDetails } from "@/hooks/products/useProductDetails";
import ProductErrorState from "@/components/product-detail/ProductErrorState";
import ProductLoadingState from "@/components/product-detail/ProductLoadingState";
import ClientProductConfigurationSection from "@/components/product-detail/ClientProductConfigurationSection";
import ProductMainContent from "@/components/product-detail/ProductMainContent";
import RelatedProducts from "@/components/product-detail/RelatedProducts";
import { useAttributeHelpers } from "@/components/product-detail/ProductAttributeHelpers";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const ClientFicheProduitWithCart = () => {
  const { id } = useParams<{ id: string }>();
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
    <div className="w-full max-w-full">
      <Button 
        variant="ghost" 
        onClick={handleBackToCatalog}
        className="mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au catalogue
      </Button>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <ProductMainContent 
          product={product}
          productName={productName}
          productDescription={productDescription}
          currentImage={currentImage}
          productBrand={productBrand}
        />
        
        <div>
          <ClientProductConfigurationSection 
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
      
      <div className="mt-8 mb-12">
        <h2 className="text-xl font-bold mb-6">Produits similaires</h2>
        <RelatedProducts 
          category={productCategory} 
          currentProductId={product?.id} 
          brand={productBrand}
          limit={4}
        />
      </div>
    </div>
  );
};

export default ClientFicheProduitWithCart;
