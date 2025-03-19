
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
import { Product } from "@/types/catalog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [isRequestFormOpen, setIsRequestFormOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [availableOptions, setAvailableOptions] = useState<Record<string, string[]>>({});
  const [currentImage, setCurrentImage] = useState<string>("");
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Product | null>(null);
  const duration = 36; // Fixed duration to 36 months
  
  const { data: product, isLoading, error } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProductById(id || ""),
    enabled: !!id,
  });

  // When product loads, set up initial state
  useEffect(() => {
    if (!product) return;
    
    console.log("Product loaded:", product);
    console.log("Product has variants:", product.variants?.length || 0);
    console.log("Product variation attributes:", product.variation_attributes);
    
    // Set default image
    setCurrentImage(product.image_url || "/placeholder.svg");
    
    // Set base price
    setCurrentPrice(product.monthly_price || null);
    
    // If product has no variants, we're done
    if (!product.variants || product.variants.length === 0) {
      return;
    }
    
    // Extract options from variation_attributes if available
    if (product.variation_attributes && typeof product.variation_attributes === 'object') {
      const options: Record<string, string[]> = {};
      
      // Check if it's already in the right format
      if (!Array.isArray(product.variation_attributes)) {
        Object.entries(product.variation_attributes).forEach(([key, values]) => {
          if (Array.isArray(values)) {
            options[key] = values.map(v => String(v));
          }
        });
      }
      
      if (Object.keys(options).length > 0) {
        console.log("Setting available options from variation_attributes:", options);
        setAvailableOptions(options);
        
        // Set default selected options
        const initialOptions: Record<string, string> = {};
        Object.entries(options).forEach(([key, values]) => {
          if (values.length > 0) {
            initialOptions[key] = values[0];
          }
        });
        
        if (Object.keys(initialOptions).length > 0) {
          console.log("Setting initial options:", initialOptions);
          setSelectedOptions(initialOptions);
        }
        
        return;
      }
    }
    
    // If variation_attributes wasn't available or usable, extract from variants
    const optionsFromVariants: Record<string, Set<string>> = {};
    
    product.variants.forEach(variant => {
      if (!variant.attributes) return;
      
      Object.entries(variant.attributes).forEach(([key, value]) => {
        if (!optionsFromVariants[key]) {
          optionsFromVariants[key] = new Set();
        }
        optionsFromVariants[key].add(String(value));
      });
    });
    
    // Convert Sets to Arrays
    const processedOptions: Record<string, string[]> = {};
    Object.entries(optionsFromVariants).forEach(([key, values]) => {
      processedOptions[key] = Array.from(values).sort();
    });
    
    console.log("Extracted options from variants:", processedOptions);
    setAvailableOptions(processedOptions);
    
    // Set default selected options
    const defaultOptions: Record<string, string> = {};
    Object.entries(processedOptions).forEach(([key, values]) => {
      if (values.length > 0) {
        defaultOptions[key] = values[0];
      }
    });
    
    if (Object.keys(defaultOptions).length > 0) {
      console.log("Setting default options:", defaultOptions);
      setSelectedOptions(defaultOptions);
    }
  }, [product]);

  // Update price and image when options change
  useEffect(() => {
    if (!product || !product.variants || Object.keys(selectedOptions).length === 0) return;
    
    console.log("Selected options changed:", selectedOptions);
    
    const variant = findVariantByOptions(product.variants, selectedOptions);
    setSelectedVariant(variant);
    
    if (variant) {
      console.log("Found matching variant:", variant.id);
      setCurrentPrice(variant.monthly_price || product.monthly_price || null);
      
      if (variant.image_url) {
        setCurrentImage(variant.image_url);
      } else {
        setCurrentImage(product.image_url || "/placeholder.svg");
      }
    } else {
      console.log("No matching variant found");
      setCurrentPrice(product.monthly_price || null);
      setCurrentImage(product.image_url || "/placeholder.svg");
    }
  }, [selectedOptions, product]);

  const findVariantByOptions = (variants: Product[], options: Record<string, string>): Product | null => {
    if (!variants || variants.length === 0 || Object.keys(options).length === 0) return null;
    
    const matchingVariant = variants.find(variant => {
      if (!variant.attributes) return false;
      
      // Check if all selected options match this variant
      return Object.entries(options).every(([key, value]) => {
        const variantValue = variant.attributes ? String(variant.attributes[key]) : undefined;
        return variantValue === value;
      });
    });
    
    return matchingVariant || null;
  };

  const handleOptionChange = (optionName: string, value: string) => {
    console.log(`Changing option ${optionName} to ${value}`);
    setSelectedOptions(prev => ({
      ...prev,
      [optionName]: value
    }));
  };

  const handleBackToCatalog = () => {
    navigate("/catalogue");
  };

  const handleRequestProduct = () => {
    setIsRequestFormOpen(true);
  };

  const handleQuantityChange = (value: number) => {
    if (value >= 1) {
      setQuantity(value);
    }
  };

  const calculateTotalPrice = (): number => {
    return (currentPrice || 0) * quantity;
  };

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

  const isOptionAvailable = (optionName: string, value: string): boolean => {
    if (!product || !product.variants) return false;
    
    // Copy all currently selected options except the one we're checking
    const otherOptions = { ...selectedOptions };
    delete otherOptions[optionName];
    
    // A configuration is available if there's at least one variant with:
    // 1. This option value for the current option
    // 2. Matching values for all other currently selected options
    return product.variants.some(variant => {
      if (!variant.attributes) return false;
      
      // First check if this variant has the option value we're checking
      const variantValue = String(variant.attributes[optionName]);
      if (variantValue !== value) return false;
      
      // Then check if this variant matches all our other selected options
      return Object.entries(otherOptions).every(([key, val]) => {
        return String(variant.attributes[key]) === val;
      });
    });
  };

  const getSelectedSpecifications = (): Record<string, string | number> => {
    // Use selected variant specs if available, otherwise use the base product specs
    if (selectedVariant?.specifications) {
      return selectedVariant.specifications;
    }
    return product?.specifications || {};
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

  const hasOptions = Object.keys(availableOptions).length > 0;
  const hasVariants = product.variants && product.variants.length > 0;
  const minMonthlyPrice = getMinimumMonthlyPrice();
  const totalPrice = calculateTotalPrice();
  const specifications = getSelectedSpecifications();
  
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
                  <div className="space-y-6">
                    {Object.entries(availableOptions).map(([option, values]) => (
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
                  <div className="text-amber-600 bg-amber-50 p-4 rounded-lg border border-amber-200">
                    <p className="flex items-center">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      Ce produit a {product.variants.length} variantes, mais aucune option de configuration n'a pu être récupérée.
                    </p>
                  </div>
                ) : (
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
