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
import ProductImageDisplay from "@/components/product-detail/ProductImageDisplay";
import ProductDescription from "@/components/product-detail/ProductDescription";
import ProductBenefits from "@/components/product-detail/ProductBenefits";
import OrderProcess from "@/components/product-detail/OrderProcess";
import ProductIncludedServices from "@/components/product-detail/ProductIncludedServices";
import RelatedProducts from "@/components/product-detail/RelatedProducts";
import CustomerReviews from "@/components/product-detail/CustomerReviews";
import CO2SavingsCalculator from "@/components/product-detail/CO2SavingsCalculator";

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
    setDuration,
    totalPrice,
    minMonthlyPrice,
    specifications,
    hasVariants,
    hasOptions,
    variationAttributes,
    hasAttributeOptions,
    getOptionsForAttribute,
    availableDurations
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
  
  const productName = product?.name || "Produit";
  const productCategory = product?.category || "Autre";
  const productBrand = product?.brand || "";
  const productDescription = product?.description || "Aucune description disponible pour ce produit.";
  
  const renderAttributeField = (attributeName: string, displayName: string, currentValue: string) => {
    const hasOptions = hasAttributeOptions(attributeName);
    const options = hasOptions ? getOptionsForAttribute(attributeName) : [];
    
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">{displayName}</label>
        {hasOptions && options.length > 0 ? (
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
      <PublicHeader />
      
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
          <div>
            <ProductImageDisplay 
              imageUrl={currentImage} 
              altText={product?.name} 
            />
            
            <div className="mt-8">
              <ProductDescription 
                title={`Descriptif ${productBrand} ${productName}`}
                description={productDescription} 
              />
            </div>
            
            <div className="mt-8">
              <ProductBenefits />
              
              <OrderProcess />
              
              <ProductIncludedServices />
            </div>
            
            <div className="mt-16">
              <h2 className="text-2xl font-bold mb-6">Produits de la même catégorie que {productName}</h2>
              <RelatedProducts category={productCategory} currentProductId={product?.id} />
            </div>
            
            <div className="mt-16">
              <CustomerReviews />
            </div>
          </div>
          
          <div>
            <div className="sticky top-4 rounded-xl overflow-hidden shadow-lg">
              <div className="bg-gradient-to-br from-[#2d618f] via-[#347599] to-[#4ab6c4] text-white p-6">
                <div className="flex mb-2">
                  <Badge variant="outline" className="bg-white/20 text-white border-white/30 mr-2">
                    {productCategory === "laptop" ? "Ordinateur" : productCategory}
                  </Badge>
                  <span className="text-indigo-100">{productBrand}</span>
                </div>
                
                <h1 className="text-3xl font-bold mb-2 text-white">
                  Leasing {productName}
                </h1>
                
                <div className="text-lg text-indigo-100 mb-4">
                  à partir de <span className="font-bold text-white">{formatCurrency(minMonthlyPrice)}/mois</span>
                </div>
              </div>
              
              <div className="bg-white p-6 border-x border-b border-gray-100">
                <Separator className="my-4" />
                
                <div className="mb-6">
                  <h3 className="text-xl font-medium mb-4 text-gray-800">Sélectionnez votre configuration idéale</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {configAttributes.map(attribute => {
                      const displayName = getDisplayName(attribute);
                      const currentValue = getCurrentValue(attribute);
                      
                      return (
                        <React.Fragment key={attribute}>
                          {renderAttributeField(attribute, displayName, currentValue)}
                        </React.Fragment>
                      );
                    })}
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Durée</label>
                      <Select 
                        value={String(duration)}
                        onValueChange={(value) => setDuration(Number(value))}
                      >
                        <SelectTrigger>
                          <SelectValue>{duration} mois</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {availableDurations.map((months) => (
                            <SelectItem key={months} value={String(months)}>
                              {months} mois
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Quantité souhaitée</label>
                      <div className="flex items-center">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-r-none border-gray-200"
                          onClick={() => handleQuantityChange(quantity - 1)}
                          disabled={quantity <= 1}
                        >
                          <MinusIcon className="h-4 w-4" />
                        </Button>
                        <div className="h-10 px-4 flex items-center justify-center border-y border-gray-200">
                          {quantity}
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-l-none border-gray-200"
                          onClick={() => handleQuantityChange(quantity + 1)}
                        >
                          <PlusIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {productCategory && (
                  <div className="mb-4">
                    <CO2SavingsCalculator 
                      category={productCategory}
                      quantity={quantity}
                    />
                  </div>
                )}
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-700 font-medium">Votre sélection pour {duration} mois</span>
                    <span className="text-2xl font-bold text-[#2d618f]">{formatCurrency(totalPrice)} HT / mois</span>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <Button 
                      className="w-full sm:w-auto px-8 bg-[#2d618f] hover:bg-[#347599]"
                      onClick={handleRequestProduct}
                    >
                      Ajouter
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full sm:w-auto border-blue-200 text-[#2d618f] hover:bg-blue-50"
                      onClick={() => toast.info("Un conseiller vous contactera bientôt.")}
                    >
                      Parler à un conseiller
                    </Button>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Check className="h-4 w-4 text-[#347599] mr-2" />
                      <span>Livraison gratuite en Europe</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Check className="h-4 w-4 text-[#347599] mr-2" />
                      <span>Pas de premier loyer majoré</span>
                    </div>
                  </div>
                </div>
                
                <Button 
                  variant="link" 
                  className="text-[#2d618f]"
                  onClick={() => toast.info("Un conseiller vous contactera bientôt.")}
                >
                  Besoin d&apos;aide ?
                </Button>
              </div>
            </div>
          </div>
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
