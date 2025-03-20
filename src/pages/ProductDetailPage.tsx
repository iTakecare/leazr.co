
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProductById } from "@/services/catalogService";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";
import { ShoppingCart, ArrowLeft, Check, ChevronDown, ChevronUp, Minus, Plus, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import PublicHeader from "@/components/catalog/public/PublicHeader";
import ProductRequestForm from "@/components/catalog/public/ProductRequestForm";
import { toast } from "sonner";
import { Product, ProductVariationAttributes } from "@/types/catalog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [isRequestFormOpen, setIsRequestFormOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [currentImage, setCurrentImage] = useState<string>("");
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Product | null>(null);
  const duration = 36; // Fixed duration to 36 months
  
  const { data: product, isLoading, error } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProductById(id || ""),
    enabled: !!id,
  });

  // Initialize product data when loaded
  useEffect(() => {
    if (!product) return;
    
    console.log("Product loaded:", product);
    
    // Set default image
    setCurrentImage(product.image_url || "/placeholder.svg");
    
    // Set base price
    setCurrentPrice(product.monthly_price || null);
    
    // Check if product has variants
    const hasVariants = product.variants && product.variants.length > 0;
    console.log("Product has variants:", hasVariants ? product.variants.length : 0);
    
    if (!hasVariants) return;
    
    // Log variation attributes
    console.log("Product variation attributes:", product.variation_attributes);
    
    // Initialize available options from variation_attributes
    if (product.variation_attributes && typeof product.variation_attributes === 'object') {
      const options = { ...product.variation_attributes };
      
      // Set initial selected options (select first option for each attribute)
      const initialOptions: Record<string, string> = {};
      Object.entries(options).forEach(([key, values]) => {
        if (values && values.length > 0) {
          initialOptions[key] = values[0];
        }
      });
      
      console.log("Setting initial options:", initialOptions);
      setSelectedOptions(initialOptions);
    }
  }, [product]);

  // Update selected variant and price when options change
  useEffect(() => {
    if (!product || !product.variants || product.variants.length === 0 || Object.keys(selectedOptions).length === 0) {
      return;
    }
    
    console.log("Selected options changed:", selectedOptions);
    
    // Find matching variant based on selected options
    const variant = findMatchingVariant(product.variants, selectedOptions);
    
    console.log("Found variant:", variant ? variant.id : "none");
    setSelectedVariant(variant);
    
    if (variant) {
      // Update price and image from variant
      setCurrentPrice(variant.monthly_price || product.monthly_price || null);
      setCurrentImage(variant.image_url || product.image_url || "/placeholder.svg");
    } else {
      // Reset to product defaults
      setCurrentPrice(product.monthly_price || null);
      setCurrentImage(product.image_url || "/placeholder.svg");
    }
  }, [selectedOptions, product]);

  // Find variant that matches all selected options
  const findMatchingVariant = (variants: Product[], options: Record<string, string>): Product | null => {
    console.log("Finding matching variant for options:", options);
    console.log("Available variants:", variants.map(v => ({id: v.id, attributes: v.attributes})));
    
    if (!variants || variants.length === 0 || Object.keys(options).length === 0) {
      return null;
    }
    
    // Find variant that matches all selected options
    return variants.find(variant => {
      if (!variant.attributes) return false;
      
      // Check if all selected options match this variant's attributes
      return Object.entries(options).every(([key, value]) => {
        const variantValue = String(variant.attributes?.[key] || '');
        const match = variantValue === value;
        
        if (!match) {
          console.log(`Option ${key}=${value} doesn't match variant ${variant.id} with ${key}=${variantValue}`);
        }
        
        return match;
      });
    }) || null;
  };

  // Check if a specific option is available with current selections
  const isOptionAvailable = (optionName: string, value: string): boolean => {
    if (!product || !product.variants) return false;
    
    // Copy current options, but remove the one we're checking
    const otherOptions = { ...selectedOptions };
    delete otherOptions[optionName];
    
    // Option is available if at least one variant has:
    // 1. This option value for the current attribute
    // 2. Matching values for all other currently selected attributes
    return product.variants.some(variant => {
      if (!variant.attributes) return false;
      
      // Check if this variant has the option we're looking for
      const variantValue = String(variant.attributes[optionName] || '');
      if (variantValue !== value) return false;
      
      // Check if this variant matches our other selected options
      return Object.entries(otherOptions).every(([key, val]) => {
        const matchValue = String(variant.attributes?.[key] || '');
        return matchValue === val;
      });
    });
  };

  // Update selected option
  const handleOptionChange = (optionName: string, value: string) => {
    if (!isOptionAvailable(optionName, value)) return;
    
    console.log(`Changing option ${optionName} to ${value}`);
    setSelectedOptions(prev => ({
      ...prev,
      [optionName]: value
    }));
  };

  // Navigation
  const handleBackToCatalog = () => {
    navigate("/catalogue");
  };

  // Form handling
  const handleRequestProduct = () => {
    setIsRequestFormOpen(true);
  };

  // Quantity adjustment
  const handleQuantityChange = (value: number) => {
    if (value >= 1) {
      setQuantity(value);
    }
  };

  // Price calculation
  const calculateTotalPrice = (): number => {
    return (currentPrice || 0) * quantity;
  };

  // Get minimum monthly price from all variants
  const getMinimumMonthlyPrice = (): number => {
    if (!product) return 0;
    
    let minPrice = product.monthly_price || 0;
    
    if (product.variants && product.variants.length > 0) {
      const variantPrices = product.variants
        .map(variant => variant.monthly_price || 0)
        .filter(price => price > 0);
      
      if (variantPrices.length > 0) {
        const minVariantPrice = Math.min(...variantPrices);
        if (minVariantPrice > 0 && (minPrice === 0 || minVariantPrice < minPrice)) {
          minPrice = minVariantPrice;
        }
      }
    }
    
    return minPrice;
  };

  // Get specifications from selected variant or product
  const getSelectedSpecifications = (): Record<string, string | number> => {
    return selectedVariant?.specifications || product?.specifications || {};
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

  // Check if product has variants and options
  const hasVariants = product.variants && product.variants.length > 0;
  const hasOptions = product.variation_attributes && Object.keys(product.variation_attributes).length > 0;
  
  // Calculate prices
  const minMonthlyPrice = getMinimumMonthlyPrice();
  const totalPrice = calculateTotalPrice();
  
  // Get specifications
  const specifications = getSelectedSpecifications();
  
  // Debug variant information
  console.log("Product variation attributes:", product.variation_attributes);
  console.log("Has options:", hasOptions);
  console.log("Has variants:", hasVariants);
  console.log("Selected options:", selectedOptions);
  console.log("Selected variant:", selectedVariant);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center space-x-2 mb-6">
          <Button variant="ghost" size="sm" onClick={handleBackToCatalog} className="flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au catalogue
          </Button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center">
            <img 
              src={currentImage} 
              alt={product?.name}
              className="max-w-full max-h-96 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
          </div>
          
          {/* Product Info */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200">
                {product?.category === "laptop" ? "Ordinateur portable" : 
                  product?.category === "desktop" ? "Ordinateur fixe" : 
                  product?.category === "tablet" ? "Tablette" : 
                  product?.category === "smartphone" ? "Smartphone" : 
                  product?.category === "monitor" ? "Écran" : 
                  product?.category === "printer" ? "Imprimante" : 
                  "Équipement"}
              </Badge>
              <Badge variant="outline">{product?.brand}</Badge>
            </div>
            
            <h1 className="text-3xl font-bold mb-2">
              {product?.name}
            </h1>
            
            <div className="text-lg text-gray-700 mb-4">
              {currentPrice ? (
                <span className="font-bold text-indigo-700">{formatCurrency(currentPrice)}/mois</span>
              ) : (
                <>
                  à partir de <span className="font-bold text-indigo-700">{formatCurrency(minMonthlyPrice)}/mois</span>
                </>
              )}
            </div>
            
            <div className="mb-4">
              <p className="text-gray-600">
                {product?.description || "Cet appareil est disponible à la location pour votre entreprise. Configurez-le selon vos besoins et demandez une offre personnalisée."}
              </p>
            </div>
            
            <Separator className="my-4" />
            
            {/* Configuration Options */}
            <div className="mb-6">
              <h3 className="text-xl font-medium mb-4">Configuration</h3>
              
              <div className="bg-gray-50 p-6 rounded-lg border space-y-6">
                {hasVariants && hasOptions ? (
                  // Show configuration options if product has variants and options
                  <div className="space-y-6">
                    {Object.entries(product.variation_attributes || {}).map(([option, values]) => (
                      <div key={option} className="rounded-lg border border-gray-200 p-4 bg-white shadow-sm">
                        <label className="block text-sm font-medium text-gray-700 capitalize mb-3">
                          {option}
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {values.map((value) => {
                            const isAvailable = isOptionAvailable(option, value);
                            const isSelected = selectedOptions[option] === value;
                            
                            return (
                              <Button
                                key={value}
                                type="button"
                                size="sm"
                                variant={isSelected ? "default" : "outline"}
                                className={`
                                  ${isSelected ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                                  ${!isAvailable ? "opacity-50 cursor-not-allowed" : ""}
                                `}
                                onClick={() => isAvailable && handleOptionChange(option, value)}
                                disabled={!isAvailable}
                              >
                                {value}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : hasVariants ? (
                  // Show warning if product has variants but no options could be extracted
                  <div className="text-amber-600 bg-amber-50 p-4 rounded-lg border border-amber-200">
                    <p className="flex items-center">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      Ce produit a {product.variants.length} variantes, mais aucune option de configuration n'a pu être récupérée.
                    </p>
                  </div>
                ) : (
                  // Show message if product has no configuration options
                  <div className="text-gray-500">Aucune option de configuration disponible pour ce produit.</div>
                )}
                
                {/* Quantity Selector */}
                <div className="rounded-lg border border-gray-200 p-4 bg-white shadow-sm">
                  <h4 className="block text-sm font-medium text-gray-700 capitalize mb-3">Quantité</h4>
                  <div className="flex items-center border rounded-md w-fit">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="rounded-r-none h-10"
                      onClick={() => handleQuantityChange(quantity - 1)}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="px-4 py-2 font-medium border-x">{quantity}</div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="rounded-l-none h-10"
                      onClick={() => handleQuantityChange(quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Price Box */}
            <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-100 mb-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-700 font-medium">Total mensuel (HT)</span>
                <span className="text-2xl font-bold text-indigo-700">{formatCurrency(totalPrice)} / mois</span>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  className="w-full sm:w-auto px-8 bg-indigo-600 hover:bg-indigo-700"
                  onClick={handleRequestProduct}
                >
                  Demander une offre
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full sm:w-auto"
                  onClick={() => toast.info("Un conseiller vous contactera bientôt.")}
                >
                  Parler à un conseiller
                </Button>
              </div>
              
              {/* Features */}
              <div className="mt-4 text-sm text-gray-600 grid grid-cols-2 gap-y-2">
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Livraison gratuite</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Pas de premier loyer majoré</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Garantie étendue incluse</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Support technique</span>
                </div>
              </div>
            </div>
            
            {/* Specifications */}
            {Object.keys(specifications).length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-medium mb-3">Caractéristiques</h3>
                <div className="bg-white rounded-lg border overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-px text-sm">
                    {Object.entries(specifications).map(([key, value], index) => (
                      <div key={key} className={`p-3 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                        <span className="font-medium capitalize mr-1">{key}:</span>
                        <span className="text-gray-700">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
