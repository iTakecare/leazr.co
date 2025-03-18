
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProductById } from "@/services/catalogService";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";
import { ShoppingCart, ArrowLeft, Check, ChevronDown, ChevronUp, Minus, Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import PublicHeader from "@/components/catalog/public/PublicHeader";
import ProductRequestForm from "@/components/catalog/public/ProductRequestForm";
import { toast } from "sonner";
import { Product, ProductVariant } from "@/types/catalog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [isRequestFormOpen, setIsRequestFormOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const duration = 36; // Fixed duration to 36 months
  
  const { data: product, isLoading, error } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProductById(id || ""),
    enabled: !!id,
  });

  const [availableOptions, setAvailableOptions] = useState<Record<string, string[]>>({});
  const [currentImage, setCurrentImage] = useState<string>("");
  const [validCombinations, setValidCombinations] = useState<Array<Record<string, string>>>([]);

  // Process product data when it's loaded
  useEffect(() => {
    if (product) {
      console.log("Product loaded:", product);
      
      // Set default image
      setCurrentImage(product.image_url || product.imageUrl || "/placeholder.svg");
      
      // Extract available options from variants
      const options: Record<string, string[]> = {};
      const allCombinations: Array<Record<string, string>> = [];
      
      if (product.variants && product.variants.length > 0) {
        console.log("Product has variants:", product.variants);
        
        // For each variant, extract attributes and add them as options
        product.variants.forEach(variant => {
          if (variant.attributes) {
            // Convert attributes to a standard format for processing
            const variantAttributes = Array.isArray(variant.attributes) 
              ? {} 
              : variant.attributes as Record<string, string | number | boolean>;
            
            // Create a combination object representing this variant's attributes
            const combination: Record<string, string> = {};
            
            Object.entries(variantAttributes).forEach(([key, value]) => {
              if (!options[key]) {
                options[key] = [];
              }
              const stringValue = String(value);
              if (!options[key].includes(stringValue)) {
                options[key].push(stringValue);
              }
              combination[key] = stringValue;
            });
            
            // Add this combination to our list of valid combinations
            if (Object.keys(combination).length > 0) {
              allCombinations.push(combination);
            }
          }
        });
      } 
      // If the product has variation attributes but no variants
      else if (product.variation_attributes && Object.keys(product.variation_attributes).length > 0) {
        const combination: Record<string, string> = {};
        
        Object.entries(product.variation_attributes).forEach(([key, value]) => {
          options[key] = [String(value)];
          combination[key] = String(value);
        });
        
        if (Object.keys(combination).length > 0) {
          allCombinations.push(combination);
        }
      }
      // If the product has attributes but no variants
      else if (product.attributes && typeof product.attributes === 'object' && !Array.isArray(product.attributes)) {
        const combination: Record<string, string> = {};
        
        Object.entries(product.attributes).forEach(([key, value]) => {
          options[key] = [String(value)];
          combination[key] = String(value);
        });
        
        if (Object.keys(combination).length > 0) {
          allCombinations.push(combination);
        }
      }
      // Extract from specifications as a fallback
      else if (product.specifications && Object.keys(product.specifications).length > 0) {
        const combination: Record<string, string> = {};
        
        Object.entries(product.specifications).forEach(([key, value]) => {
          options[key] = [String(value)];
          combination[key] = String(value);
        });
        
        if (Object.keys(combination).length > 0) {
          allCombinations.push(combination);
        }
      }
      
      console.log("Extracted options:", options);
      console.log("Valid combinations:", allCombinations);
      
      setAvailableOptions(options);
      setValidCombinations(allCombinations);
      
      // Set default selected options
      const defaultOptions: Record<string, string> = {};
      Object.entries(options).forEach(([key, values]) => {
        if (values.length > 0) {
          defaultOptions[key] = values[0];
        }
      });
      console.log("Setting default options:", defaultOptions);
      setSelectedOptions(defaultOptions);
    }
  }, [product]);

  // Update image when options change
  useEffect(() => {
    if (product && Object.keys(selectedOptions).length > 0) {
      const selectedVariant = findSelectedVariant();
      if (selectedVariant) {
        setCurrentImage(selectedVariant.image_url || selectedVariant.imageUrl || product.image_url || product.imageUrl || "/placeholder.svg");
      }
    }
  }, [selectedOptions]);

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

  const handleOptionChange = (optionName: string, value: string) => {
    console.log(`Option changed: ${optionName} = ${value}`);
    
    // Create a new selected options object with the new selection
    const newSelectedOptions = {
      ...selectedOptions,
      [optionName]: value
    };
    
    // Validate and adjust other selections as needed
    const validatedOptions = validateOptions(newSelectedOptions, optionName);
    
    setSelectedOptions(validatedOptions);
  };

  // Helper function to check if an option value is available based on current selections
  const isOptionAvailable = (optionName: string, optionValue: string): boolean => {
    // If no selection has been made yet, all options are available
    if (Object.keys(selectedOptions).length === 0) {
      return true;
    }
    
    // Create a test selection with current selections plus the option we're checking
    const testSelection = { ...selectedOptions, [optionName]: optionValue };
    
    // Check if any valid combination matches our test selection
    // A match means all selected keys in testSelection exist in the combination with the same values
    return validCombinations.some(combination => {
      return Object.entries(testSelection).every(([key, value]) => {
        // If this key isn't in our current test selection, it's not relevant for this check
        if (key === optionName || selectedOptions[key] === undefined) {
          return true;
        }
        // The combination must have this key and the same value
        return combination[key] === value;
      });
    });
  };

  // Validate options and adjust selections to ensure they're valid
  const validateOptions = (newOptions: Record<string, string>, changedOption: string): Record<string, string> => {
    const validatedOptions = { ...newOptions };
    
    // If we don't have valid combinations data, just return the new options as is
    if (validCombinations.length === 0) {
      return validatedOptions;
    }
    
    // Find combinations that match our new selection for the changed option
    const matchingCombinations = validCombinations.filter(
      combo => combo[changedOption] === newOptions[changedOption]
    );
    
    // If no matching combinations, return just the changed option
    if (matchingCombinations.length === 0) {
      return { [changedOption]: newOptions[changedOption] };
    }
    
    // For each option we have selected
    Object.keys(validatedOptions).forEach(optionKey => {
      // Skip the option that was just changed
      if (optionKey === changedOption) return;
      
      // Check if the current value for this option is valid with the new selection
      const isValid = matchingCombinations.some(
        combo => combo[optionKey] === validatedOptions[optionKey]
      );
      
      // If not valid, try to find a valid value for this option
      if (!isValid) {
        // Find the first valid value for this option from matching combinations
        const validValue = matchingCombinations.find(combo => combo[optionKey])?.[optionKey];
        
        if (validValue) {
          validatedOptions[optionKey] = validValue;
        } else {
          // If no valid value found, remove this option from selections
          delete validatedOptions[optionKey];
        }
      }
    });
    
    return validatedOptions;
  };

  const findSelectedVariant = () => {
    if (!product || !product.variants || product.variants.length === 0) {
      return null;
    }
    
    return product.variants.find(variant => {
      if (!variant.attributes) return false;
      
      // Convert attributes to a standard format for comparison
      const variantAttributes = Array.isArray(variant.attributes) 
        ? {} 
        : variant.attributes as Record<string, string | number | boolean>;
      
      return Object.entries(selectedOptions).every(([key, value]) => 
        String(variantAttributes[key]) === value
      );
    });
  };

  const calculatePrice = () => {
    let basePrice = product?.monthly_price || 0;
    
    const selectedVariant = findSelectedVariant();
    if (selectedVariant && selectedVariant.monthly_price !== undefined) {
      basePrice = selectedVariant.monthly_price;
    }
    
    return basePrice * quantity;
  };

  const renderOptions = () => {
    if (Object.keys(availableOptions).length === 0) {
      return (
        <div className="text-gray-500">Aucune option de configuration disponible pour ce produit.</div>
      );
    }

    return (
      <div className="space-y-6">
        {Object.entries(availableOptions).map(([option, values]) => (
          <div key={option} className="rounded-lg border border-gray-200 p-4 bg-white shadow-sm">
            <label className="block text-sm font-medium text-gray-700 capitalize mb-3">
              {option}
            </label>
            <div className="flex flex-wrap gap-2">
              {values.map((value) => {
                const isAvailable = isOptionAvailable(option, value);
                return (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={selectedOptions[option] === value ? "default" : "outline"}
                    className={`
                      ${selectedOptions[option] === value ? "bg-indigo-600 hover:bg-indigo-700" : ""}
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
    );
  };

  const getSelectedVariantSpecifications = () => {
    const selectedVariant = findSelectedVariant();
    return selectedVariant?.specifications || product?.specifications || {};
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
          <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center">
            <img 
              src={currentImage} 
              alt={product.name}
              className="max-w-full max-h-96 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
          </div>
          
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200">
                {product.category === "laptop" ? "Ordinateur portable" : 
                  product.category === "desktop" ? "Ordinateur fixe" : 
                  product.category === "tablet" ? "Tablette" : 
                  product.category === "smartphone" ? "Smartphone" : 
                  product.category === "monitor" ? "Écran" : 
                  product.category === "printer" ? "Imprimante" : 
                  "Équipement"}
              </Badge>
              <Badge variant="outline">{product.brand}</Badge>
            </div>
            
            <h1 className="text-3xl font-bold mb-2">
              {product.name}
            </h1>
            
            <div className="text-lg text-gray-700 mb-4">
              à partir de <span className="font-bold text-indigo-700">{formatCurrency(product.monthly_price || 0)}/mois</span>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-600">
                {product.description || "Cet appareil est disponible à la location pour votre entreprise. Configurez-le selon vos besoins et demandez une offre personnalisée."}
              </p>
            </div>
            
            <Separator className="my-4" />
            
            <div className="mb-6">
              <h3 className="text-xl font-medium mb-4">Configuration</h3>
              
              <div className="bg-gray-50 p-6 rounded-lg border space-y-6">
                {renderOptions()}
                
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
            
            <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-100 mb-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-700 font-medium">Total mensuel (HT)</span>
                <span className="text-2xl font-bold text-indigo-700">{formatCurrency(calculatePrice())} / mois</span>
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
            
            {Object.keys(getSelectedVariantSpecifications()).length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-medium mb-3">Caractéristiques</h3>
                <div className="bg-white rounded-lg border overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-px text-sm">
                    {Object.entries(getSelectedVariantSpecifications()).map(([key, value], index) => (
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
        
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Produits similaires</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((index) => (
              <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                <div className="aspect-video bg-gray-100 flex items-center justify-center p-4">
                  <img src="/placeholder.svg" alt="Product" className="object-contain max-h-full" />
                </div>
                <div className="p-3">
                  <div className="text-xs text-gray-500 mb-1">Marque</div>
                  <h3 className="font-medium text-sm">Produit similaire {index}</h3>
                  <div className="mt-2 text-sm">
                    <div className="text-xs text-gray-500">dès</div>
                    <div className="font-bold text-indigo-700">XX,XX€/mois</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
      
      <ProductRequestForm 
        isOpen={isRequestFormOpen}
        onClose={() => setIsRequestFormOpen(false)}
        product={product}
        quantity={quantity}
        selectedOptions={selectedOptions}
        duration={duration}
        monthlyPrice={calculatePrice()}
      />
    </div>
  );
};

export default ProductDetailPage;
