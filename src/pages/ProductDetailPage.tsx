
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Info, Check, MinusIcon, PlusIcon, ShoppingCart } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import PublicHeader from "@/components/catalog/public/PublicHeader";
import ProductRequestForm from "@/components/catalog/public/ProductRequestForm";
import { useProductDetails } from "@/hooks/products/useProductDetails";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Import refactored components
import ProductImageDisplay from "@/components/product-detail/ProductImageDisplay";
import ProductBadges from "@/components/product-detail/ProductBadges";
import ProductPriceDisplay from "@/components/product-detail/ProductPriceDisplay";
import QuantitySelector from "@/components/product-detail/QuantitySelector";
import VariantSelector from "@/components/product-detail/VariantSelector";
import PriceBox from "@/components/product-detail/PriceBox";
import ProductSpecificationsTable from "@/components/product-detail/ProductSpecificationsTable";
import ProductBenefits from "@/components/product-detail/ProductBenefits";
import ProductIncludedServices from "@/components/product-detail/ProductIncludedServices";
import RelatedProducts from "@/components/product-detail/RelatedProducts";
import ProductDescription from "@/components/product-detail/ProductDescription";
import OrderProcess from "@/components/product-detail/OrderProcess";
import CustomerReviews from "@/components/product-detail/CustomerReviews";

const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Use the product details hook
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
    variationAttributes
  } = useProductDetails(id);
  
  // Navigation
  const handleBackToCatalog = () => {
    navigate("/catalogue");
  };
  
  // Form handling
  const handleRequestProduct = () => {
    setIsRequestFormOpen(true);
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center space-x-2 mb-6">
            <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
            <div className="h-4 w-32 bg-gray-200 animate-pulse rounded"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-96 bg-gray-200 animate-pulse rounded-lg"></div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 animate-pulse rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 animate-pulse rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 animate-pulse rounded w-full"></div>
              <div className="h-4 bg-gray-200 animate-pulse rounded w-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicHeader />
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Produit non trouvé</h2>
          <p className="text-gray-600 mb-8">Impossible de trouver les détails de ce produit.</p>
          <Button onClick={handleBackToCatalog}>
            Retour au catalogue
          </Button>
        </div>
      </div>
    );
  }
  
  // Prepare product data
  const productName = product.name || "Produit";
  const productCategory = product.category || "Autre";
  const productBrand = product.brand || "";
  const productDescription = product.description || "Aucune description disponible pour ce produit.";
  
  // Helper function to check if an attribute has variation options
  const hasVariationOptions = (attributeName: string): boolean => {
    return variationAttributes && variationAttributes[attributeName] && variationAttributes[attributeName].length > 0;
  };

  // Helper function to get available options for an attribute
  const getAttributeOptions = (attributeName: string): string[] => {
    if (variationAttributes && variationAttributes[attributeName]) {
      return variationAttributes[attributeName].map(String);
    }
    return [];
  };

  // Helper function to render select input or static field based on available options
  const renderAttributeField = (attributeName: string, displayName: string, currentValue: string) => {
    const options = getAttributeOptions(attributeName);
    const isModifiable = hasVariationOptions(attributeName);
    
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">{displayName}</label>
        {isModifiable ? (
          <Select
            value={currentValue}
            onValueChange={(value) => handleOptionChange(attributeName, value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem 
                  key={option} 
                  value={option}
                  disabled={!isOptionAvailable(attributeName, option)}
                >
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="bg-gray-50 rounded border border-gray-200 px-3 py-2">
            {currentValue}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />
      
      {/* Breadcrumb */}
      <div className="bg-gray-50 py-2">
        <div className="container mx-auto px-4">
          <Breadcrumb>
            <BreadcrumbItem>
              <BreadcrumbLink href="/catalogue">Accueil catalogue</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/catalogue?category=${productCategory}`}>
                {productCategory === "laptop" ? "Ordinateurs" : productCategory}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/catalogue?brand=${productBrand}`}>
                {productBrand}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <span className="truncate max-w-[200px] inline-block">{productName}</span>
            </BreadcrumbItem>
          </Breadcrumb>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left column - Product Image */}
          <div className="lg:sticky lg:top-4">
            <ProductImageDisplay 
              imageUrl={currentImage} 
              altText={product.name} 
              imageUrls={product.image_urls || []}
            />
          </div>
          
          {/* Right column - Product Info and Configuration */}
          <div>
            <div className="sticky top-4 bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
              {/* Category badge & Brand */}
              <div className="flex mb-2">
                <Badge variant="outline" className="bg-indigo-100 text-indigo-800 mr-2">
                  {productCategory === "laptop" ? "Ordinateur" : productCategory}
                </Badge>
                <span className="text-gray-600">{productBrand}</span>
              </div>
              
              {/* Product Title */}
              <h1 className="text-3xl font-bold mb-2">
                Location {productName}
              </h1>
              
              {/* Product Price */}
              <div className="text-lg text-gray-700 mb-4">
                à partir de <span className="font-bold text-indigo-700">{formatCurrency(minMonthlyPrice)}/mois</span>
              </div>
              
              <Separator className="my-4" />
              
              {/* Configuration Options */}
              <div className="mb-6">
                <h3 className="text-xl font-medium mb-4">Sélectionnez votre configuration idéale.</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* État */}
                  {renderAttributeField("condition", "État", String(specifications.condition || specifications.etat || "Neuf"))}
                  
                  {/* Taille d'écran */}
                  {renderAttributeField("screen_size", "Taille d'écran", 
                    String(specifications.screen_size || specifications.taille_ecran || "15\""))}
                  
                  {/* Stockage */}
                  {renderAttributeField("stockage", "Stockage", 
                    String(specifications.storage || specifications.stockage || "256 Go"))}
                  
                  {/* Processeur */}
                  {renderAttributeField("processor", "Processeur", 
                    String(specifications.processor || specifications.processeur || `${productBrand} M4`))}
                  
                  {/* Mémoire (RAM) */}
                  {renderAttributeField("ram", "Mémoire (RAM)", 
                    String(specifications.memory || specifications.ram || "16 Go"))}
                  
                  {/* Réseau */}
                  {renderAttributeField("network", "Réseau", 
                    String(specifications.network || specifications.reseau || "Wi-Fi"))}
                  
                  {/* Carte graphique */}
                  {renderAttributeField("graphics_card", "Carte graphique", 
                    String(specifications.graphics_card || specifications.carte_graphique || "GPU 10 coeurs"))}
                  
                  {/* Clavier */}
                  {renderAttributeField("keyboard", "Clavier", 
                    String(specifications.keyboard || specifications.clavier || "Français - AZERTY"))}
                  
                  {/* Durée */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Durée</label>
                    <div className="bg-gray-50 rounded border border-gray-200 px-3 py-2">
                      {duration} mois
                    </div>
                  </div>
                  
                  {/* Quantité */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Quantité souhaitée</label>
                    <div className="flex items-center">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-r-none"
                        onClick={() => handleQuantityChange(quantity - 1)}
                        disabled={quantity <= 1}
                      >
                        <MinusIcon className="h-4 w-4" />
                      </Button>
                      <div className="h-10 px-4 flex items-center justify-center border-y border-input">
                        {quantity}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-l-none"
                        onClick={() => handleQuantityChange(quantity + 1)}
                      >
                        <PlusIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Total Price */}
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700 font-medium">Votre sélection pour</span>
                  <span className="text-2xl font-bold text-indigo-700">{formatCurrency(totalPrice)} HT / mois</span>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    className="w-full sm:w-auto px-8 bg-indigo-600 hover:bg-indigo-700"
                    onClick={handleRequestProduct}
                  >
                    Ajouter
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full sm:w-auto"
                    onClick={() => toast.info("Un conseiller vous contactera bientôt.")}
                  >
                    Parler à un conseiller
                  </Button>
                </div>
                
                {/* Shipping info */}
                <div className="mt-4 space-y-1 text-sm">
                  <div className="flex items-center text-gray-600">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    <span>Livraison gratuite en France et Europe</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    <span>Pas de premier loyer majoré</span>
                  </div>
                </div>
              </div>
              
              <Button 
                variant="link" 
                className="text-indigo-600"
                onClick={() => toast.info("Un conseiller vous contactera bientôt.")}
              >
                Besoin d&apos;aide ?
              </Button>
            </div>
            
            {/* Additional product information - below the sticky box */}
            <div className="mt-8">
              <ProductDescription 
                title={`Descriptif ${productBrand} ${productName}`}
                description={productDescription} 
              />
              
              <div className="mt-8">
                <Button 
                  variant="outline" 
                  className="mb-4"
                  onClick={() => toast.info("Affichage des caractéristiques détaillées")}
                >
                  Voir plus
                </Button>
                
                <ProductBenefits />
                
                <OrderProcess />
                
                <ProductIncludedServices />
              </div>
            </div>
          </div>
        </div>
        
        {/* Related Products */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Produits de la même catégorie que {productName}</h2>
          <RelatedProducts category={productCategory} currentProductId={product.id} />
        </div>
        
        {/* Customer Reviews */}
        <div className="mt-16">
          <CustomerReviews />
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
