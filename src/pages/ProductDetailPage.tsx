
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Info, Check, MinusIcon, PlusIcon, ShoppingCart } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import MainNavigation from "@/components/layout/MainNavigation";
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
import ProductImageDisplay from "@/components/product-detail/ProductImageDisplay";
import ProductDescription from "@/components/product-detail/ProductDescription";
import ProductBenefits from "@/components/product-detail/ProductBenefits";
import OrderProcess from "@/components/product-detail/OrderProcess";
import ProductIncludedServices from "@/components/product-detail/ProductIncludedServices";
import RelatedProducts from "@/components/product-detail/RelatedProducts";
import CustomerReviews from "@/components/product-detail/CustomerReviews";
import CO2SavingsCalculator from "@/components/product-detail/CO2SavingsCalculator";
import AddToCartButton from "@/components/product-detail/AddToCartButton";
import HomeFooter from "@/components/home/HomeFooter";

const ProductDetailPage = () => {
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
    hasVariants,
    hasOptions,
    variationAttributes,
    hasAttributeOptions,
    getOptionsForAttribute
  } = useProductDetails(id);
  
  const handleBackToCatalog = () => {
    navigate("/catalogue");
  };
  
  const handleRequestProduct = () => {
    setIsRequestFormOpen(true);
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full bg-white shadow-sm">
          <div className="container mx-auto px-4 py-6">
            <MainNavigation />
          </div>
        </div>
        <div className="container mx-auto px-4 py-8 mt-24 max-w-7xl">
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
  
  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full bg-white shadow-sm">
          <div className="container mx-auto px-4 py-6">
            <MainNavigation />
          </div>
        </div>
        <div className="container mx-auto px-4 py-16 mt-24 text-center max-w-7xl">
          <h2 className="text-2xl font-bold mb-4">Produit non trouvé</h2>
          <p className="text-gray-600 mb-8">Impossible de trouver les détails de ce produit.</p>
          <Button onClick={handleBackToCatalog}>
            Retour au catalogue
          </Button>
        </div>
      </div>
    );
  }
  
  const productName = product?.name || "Produit";
  const productCategory = product?.category || "Autre";
  const productBrand = product?.brand || "";
  const productDescription = product?.description || "Aucune description disponible pour ce produit.";
  
  const renderAttributeField = (attributeName: string, displayName: string, currentValue: string) => {
    const hasOptions = hasAttributeOptions(attributeName);
    const options = hasOptions ? getOptionsForAttribute(attributeName) : [];
    
    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-700">{displayName}</label>
        {hasOptions && options.length > 0 ? (
          <Select
            value={currentValue}
            onValueChange={(value) => handleOptionChange(attributeName, value)}
          >
            <SelectTrigger className="w-full h-7 text-xs py-0">
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem 
                  key={option} 
                  value={option}
                  disabled={!isOptionAvailable(attributeName, option)}
                  className="text-xs"
                >
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="bg-gray-50 rounded border border-gray-200 px-2 py-1 text-xs">
            {currentValue || "Non spécifié"}
          </div>
        )}
      </div>
    );
  };
  
  const getDisplayName = (key: string): string => {
    const nameMap: Record<string, string> = {
      'condition': 'État',
      'etat': 'État',
      'screen_size': "Taille d'écran",
      'taille_ecran': "Taille d'écran",
      'stockage': 'Stockage',
      'storage': 'Stockage',
      'processor': 'Processeur',
      'processeur': 'Processeur',
      'memory': 'Mémoire (RAM)',
      'ram': 'Mémoire (RAM)',
      'graphics_card': 'Carte graphique',
      'carte_graphique': 'Carte graphique',
      'network': 'Réseau',
      'reseau': 'Réseau',
      'keyboard': 'Clavier',
      'clavier': 'Clavier'
    };
    
    return nameMap[key.toLowerCase()] || key;
  };
  
  const getCanonicalName = (key: string): string => {
    const canonicalMap: Record<string, string> = {
      'condition': 'condition',
      'etat': 'condition',
      'screen_size': 'screen_size',
      'taille_ecran': 'screen_size',
      'stockage': 'stockage',
      'storage': 'stockage',
      'processor': 'processor',
      'processeur': 'processor',
      'memory': 'ram',
      'ram': 'ram',
      'graphics_card': 'graphics_card',
      'carte_graphique': 'graphics_card',
      'network': 'network',
      'reseau': 'network',
      'keyboard': 'keyboard'
    };
    
    return canonicalMap[key.toLowerCase()] || key;
  };
  
  const getConfigAttributes = () => {
    const priorityOrder = [
      "condition", "etat", 
      "screen_size", "taille_ecran", 
      "processor", "processeur", 
      "stockage", "storage", 
      "memory", "ram", 
      "graphics_card", "carte_graphique", 
      "network", "reseau", 
      "keyboard", "clavier"
    ];
    
    const allKeys = new Set([
      ...Object.keys(specifications || {}),
      ...Object.keys(variationAttributes || {})
    ]);
    
    const canonicalKeys = Array.from(allKeys).map(key => getCanonicalName(key));
    const uniqueKeys = Array.from(new Set(canonicalKeys));
    
    uniqueKeys.sort((a, b) => {
      const indexA = priorityOrder.indexOf(a.toLowerCase());
      const indexB = priorityOrder.indexOf(b.toLowerCase());
      
      const valueA = indexA === -1 ? 999 : indexA;
      const valueB = indexB === -1 ? 999 : indexB;
      
      return valueA - valueB;
    });
    
    return uniqueKeys;
  };
  
  const getCurrentValue = (attributeName: string): string => {
    if (selectedOptions[attributeName] !== undefined) {
      return String(selectedOptions[attributeName]);
    }
    
    const specValue = specifications[attributeName];
    if (specValue !== undefined) {
      return String(specValue);
    }
    
    const variationValues = variationAttributes[attributeName];
    if (variationValues && variationValues.length > 0) {
      return String(variationValues[0]);
    }
    
    return "";
  };
  
  const configAttributes = getConfigAttributes();
  
  return (
    <div className="min-h-screen bg-white">
      <div className="w-full bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <MainNavigation />
        </div>
      </div>
      
      <div className="bg-white py-4 mt-24 border-b">
        <div className="container mx-auto px-4 max-w-7xl">
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
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main content - 8 columns */}
          <div className="lg:col-span-8 space-y-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToCatalog}
              className="mb-4 text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour au catalogue
            </Button>
            
            <div className="bg-white rounded-xl overflow-hidden shadow-sm border">
              <div className="p-6">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="md:w-1/2">
                    <ProductImageDisplay 
                      imageUrl={currentImage} 
                      altText={product?.name} 
                    />
                  </div>
                  <div className="md:w-1/2">
                    <div className="mb-2">
                      {product.brand && (
                        <p className="text-sm text-gray-500 font-medium">{product.brand}</p>
                      )}
                      <h1 className="text-2xl md:text-3xl font-bold mb-2">{productName}</h1>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {product.category && (
                          <Badge variant="outline" className="bg-gray-100">
                            {productCategory === "laptop" ? "Ordinateur" : productCategory}
                          </Badge>
                        )}
                        
                        {hasVariants && (
                          <Badge variant="outline" className="bg-purple-100 text-purple-800">
                            Plusieurs configurations
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="py-3 px-4 bg-blue-50 rounded-lg mb-4">
                      <span className="block text-sm text-gray-600 mb-1">Prix mensuel</span>
                      <span className="text-2xl font-bold text-blue-700">
                        {formatCurrency(totalPrice)} HT / mois
                      </span>
                      <span className="text-sm text-gray-500 ml-1">pour 36 mois</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {configAttributes.slice(0, 6).map(attribute => {
                        const displayName = getDisplayName(attribute);
                        const currentValue = getCurrentValue(attribute);
                        return currentValue ? (
                          <div key={attribute} className="bg-gray-50 p-2 rounded border">
                            <div className="text-xs text-gray-500">{displayName}</div>
                            <div className="font-medium text-sm">{currentValue}</div>
                          </div>
                        ) : null;
                      })}
                    </div>
                    
                    {productCategory && (
                      <div className="mb-4">
                        <CO2SavingsCalculator 
                          category={productCategory} 
                          quantity={quantity}
                        />
                      </div>
                    )}
                    
                    <div className="flex items-center mb-4">
                      <div className="mr-4">
                        <label className="text-sm font-medium text-gray-700 block mb-1">Quantité</label>
                        <div className="flex items-center">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-r-none"
                            onClick={() => handleQuantityChange(quantity - 1)}
                            disabled={quantity <= 1}
                          >
                            <MinusIcon className="h-4 w-4" />
                          </Button>
                          <div className="h-8 px-4 flex items-center justify-center border-y border-x-0 border-gray-200">
                            {quantity}
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-l-none"
                            onClick={() => handleQuantityChange(quantity + 1)}
                          >
                            <PlusIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Durée</label>
                        <div className="bg-gray-50 rounded border border-gray-200 px-4 py-1.5 text-sm">
                          36 mois
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 mt-6">
                      <AddToCartButton 
                        product={product}
                        quantity={quantity}
                        duration={duration}
                        currentPrice={currentPrice}
                        selectedOptions={selectedOptions}
                        navigateToCart={false}
                      />
                      
                      <Button 
                        variant="outline" 
                        className="border-blue-200 text-blue-700 hover:bg-blue-50"
                        onClick={() => toast.info("Un conseiller vous contactera bientôt.")}
                      >
                        <Info className="h-4 w-4 mr-2" />
                        Conseiller
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <div className="flex items-center text-gray-600 text-sm">
                        <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        <span>Livraison gratuite</span>
                      </div>
                      <div className="flex items-center text-gray-600 text-sm">
                        <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        <span>Pas de loyer majoré</span>
                      </div>
                      <div className="flex items-center text-gray-600 text-sm">
                        <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        <span>Maintenance incluse</span>
                      </div>
                      <div className="flex items-center text-gray-600 text-sm">
                        <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        <span>Garantie étendue</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          
            <ProductDescription 
              title={`Descriptif ${productBrand} ${productName}`}
              description={productDescription} 
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ProductBenefits />
              <ProductIncludedServices />
            </div>
            
            <OrderProcess />
            
            <div className="mt-10">
              <h2 className="text-2xl font-bold mb-6">Produits similaires</h2>
              <RelatedProducts category={productCategory} currentProductId={product?.id} />
            </div>
            
            <CustomerReviews />
          </div>
          
          {/* Sidebar - 4 columns */}
          <div className="lg:col-span-4">
            <div className="sticky top-8">
              <div className="rounded-xl overflow-hidden shadow-md border">
                <div className="bg-gradient-to-br from-[#2d618f] via-[#347599] to-[#4ab6c4] p-4 text-white">
                  <h2 className="text-xl font-bold">
                    Leasing {productName}
                  </h2>
                  <p className="text-sm text-white/80">
                    à partir de <span className="font-bold text-white">{formatCurrency(minMonthlyPrice)}</span> /mois
                  </p>
                </div>
                
                <div className="p-4">
                  <h3 className="font-medium mb-3 text-gray-800">Configuration complète</h3>
                  
                  <div className="space-y-3 mb-4">
                    {configAttributes.map(attribute => {
                      const displayName = getDisplayName(attribute);
                      const currentValue = getCurrentValue(attribute);
                      
                      return currentValue ? (
                        <div key={attribute} className="flex justify-between">
                          <span className="text-sm text-gray-600">{displayName}</span>
                          <span className="text-sm font-medium">{currentValue}</span>
                        </div>
                      ) : null;
                    })}
                    
                    <Separator />
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Durée du contrat</span>
                      <span className="text-sm font-medium">36 mois</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Quantité</span>
                      <span className="text-sm font-medium">{quantity}</span>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total mensuel</span>
                      <span className="text-xl font-bold text-blue-700">{formatCurrency(totalPrice)} HT</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <AddToCartButton 
                      product={product}
                      quantity={quantity}
                      duration={duration}
                      currentPrice={currentPrice}
                      selectedOptions={selectedOptions}
                      navigateToCart={false}
                    />
                    
                    <Button 
                      variant="outline" 
                      className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                      onClick={() => toast.info("Un conseiller vous contactera bientôt.")}
                    >
                      <Info className="h-4 w-4 mr-2" />
                      Besoin d'aide ?
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <HomeFooter />
      
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
