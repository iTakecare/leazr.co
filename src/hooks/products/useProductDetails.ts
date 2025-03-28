
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProductById } from "@/services/catalogService";
import { Product, ProductVariationAttributes } from "@/types/catalog";

export const useProductDetails = (productId: string | undefined) => {
  const [quantity, setQuantity] = useState(1);
  const [isRequestFormOpen, setIsRequestFormOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [currentImage, setCurrentImage] = useState<string>("");
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Product | null>(null);
  const [variationAttributes, setVariationAttributes] = useState<ProductVariationAttributes>({});
  const duration = 36; // Fixed duration to 36 months
  
  const { data: product, isLoading, error } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => getProductById(productId || ""),
    enabled: !!productId,
  });
  
  useEffect(() => {
    if (!product) return;
    
    console.log("Product loaded:", product);
    
    // Set initial image
    setCurrentImage(product.image_url || "/placeholder.svg");
    
    // Set initial price
    setCurrentPrice(product.monthly_price || null);
    
    // Store variation attributes for later use in UI
    if (product.variation_attributes && Object.keys(product.variation_attributes).length > 0) {
      console.log("Product has variation attributes:", product.variation_attributes);
      setVariationAttributes(product.variation_attributes);
    } else if (product.variant_combination_prices && 
               Array.isArray(product.variant_combination_prices) && 
               product.variant_combination_prices.length > 0) {
      // Extract variation attributes from variant combination prices if not directly provided
      const extractedAttributes: ProductVariationAttributes = {};
      
      // Ensure variant_combination_prices is an array before processing
      const variantPrices = Array.isArray(product.variant_combination_prices) 
        ? product.variant_combination_prices 
        : [];
        
      variantPrices.forEach(price => {
        if (price.attributes) {
          Object.entries(price.attributes).forEach(([key, value]) => {
            if (!extractedAttributes[key]) {
              extractedAttributes[key] = [];
            }
            
            const stringValue = String(value);
            if (extractedAttributes[key] && !extractedAttributes[key].includes(stringValue)) {
              extractedAttributes[key].push(stringValue);
            }
          });
        }
      });
      
      console.log("Extracted variation attributes from prices:", extractedAttributes);
      setVariationAttributes(extractedAttributes);
    }
    
    // Initialize selected options from product specifications if available
    const initialOptions: Record<string, string> = {};
    
    // Map common specification fields to their attribute names
    const specToAttributeMap: Record<string, string> = {
      'storage': 'stockage',
      'stockage': 'stockage',
      'memory': 'ram',
      'ram': 'ram',
      'keyboard': 'keyboard',
      'clavier': 'keyboard',
      'processor': 'processor',
      'processeur': 'processor',
      'screen_size': 'screen_size',
      'taille_ecran': 'screen_size',
      'graphics_card': 'graphics_card',
      'carte_graphique': 'graphics_card',
      'network': 'network',
      'reseau': 'network',
      'condition': 'condition',
      'etat': 'condition'
    };
    
    // Populate initial options from specifications
    if (product.specifications) {
      Object.entries(product.specifications).forEach(([key, value]) => {
        const attributeName = specToAttributeMap[key.toLowerCase()] || key;
        if (value !== undefined && value !== null) {
          initialOptions[attributeName] = String(value);
        }
      });
    }
    
    // If the product has variant attributes, initialize selections from them
    const hasVariants = product.variants && product.variants.length > 0 || 
                       (product.variant_combination_prices && product.variant_combination_prices.length > 0);
    
    console.log("Product has variants:", hasVariants);
    
    if (hasVariants && product.variation_attributes && typeof product.variation_attributes === 'object') {
      Object.entries(product.variation_attributes).forEach(([key, values]) => {
        if (values && values.length > 0) {
          // If we already have an initial option for this attribute that matches one of the available values, keep it
          if (!initialOptions[key] || !values.includes(initialOptions[key])) {
            initialOptions[key] = String(values[0]);
          }
        }
      });
    }
    
    console.log("Setting initial options:", initialOptions);
    setSelectedOptions(initialOptions);
  }, [product]);
  
  useEffect(() => {
    if (!product || Object.keys(selectedOptions).length === 0) {
      return;
    }
    
    console.log("Selected options changed:", selectedOptions);
    
    // Check if the product has variants
    if (product.variants && product.variants.length > 0) {
      const variant = findMatchingVariant(product.variants, selectedOptions);
      console.log("Found variant:", variant ? variant.id : "none");
      setSelectedVariant(variant);
      
      if (variant) {
        setCurrentPrice(variant.monthly_price || product.monthly_price || null);
        setCurrentImage(variant.image_url || product.image_url || "/placeholder.svg");
      }
    } 
    // Check if the product has variant_combination_prices
    else if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
      const variantPrice = findMatchingVariantPrice(product.variant_combination_prices, selectedOptions);
      console.log("Found variant price:", variantPrice);
      
      if (variantPrice) {
        setCurrentPrice(variantPrice.monthly_price || variantPrice.price || null);
        
        // Create a pseudo-variant for the selected options
        const pseudoVariant = {
          ...product,
          price: variantPrice.price,
          monthly_price: variantPrice.monthly_price || null,
          selected_attributes: selectedOptions
        };
        
        setSelectedVariant(pseudoVariant);
        
        // Update image if variant has one
        if (variantPrice.image_url) {
          setCurrentImage(variantPrice.image_url);
        }
      } else {
        // If no exact match, use the product's default price
        setCurrentPrice(product.monthly_price || null);
        setSelectedVariant(null);
      }
    } else {
      // No variants or variant prices, just use product price
      setCurrentPrice(product.monthly_price || null);
    }
  }, [selectedOptions, product]);
  
  const findMatchingVariant = (variants: Product[], options: Record<string, string>): Product | null => {
    console.log("Finding matching variant for options:", options);
    console.log("Available variants:", variants.map(v => ({id: v.id, attributes: v.attributes})));
    
    if (!variants || variants.length === 0 || Object.keys(options).length === 0) {
      return null;
    }
    
    return variants.find(variant => {
      if (!variant.attributes) return false;
      
      return Object.entries(options).every(([key, value]) => {
        // Convert variant attribute value to string for comparison
        const variantValue = String(variant.attributes?.[key] || '');
        const match = variantValue === value;
        
        if (!match) {
          console.log(`Option ${key}=${value} doesn't match variant ${variant.id} with ${key}=${variantValue}`);
        }
        
        return match;
      });
    }) || null;
  };
  
  const findMatchingVariantPrice = (
    variantPrices: any[], 
    options: Record<string, string>
  ): { price: number, monthly_price?: number, image_url?: string } | null => {
    if (!variantPrices || variantPrices.length === 0 || Object.keys(options).length === 0) {
      return null;
    }
    
    // Filter attributes that are actually part of the variation attributes
    const relevantOptions = Object.keys(options).reduce((acc, key) => {
      if (variationAttributes[key]) {
        acc[key] = options[key];
      }
      return acc;
    }, {} as Record<string, string>);
    
    console.log("Looking for variant price with relevant options:", relevantOptions);
    console.log("Available variant prices:", variantPrices.map(p => p.attributes));
    
    return variantPrices.find(price => {
      if (!price.attributes) return false;
      
      // Check if all selected attributes match this price configuration
      return Object.entries(relevantOptions).every(([key, value]) => {
        // Convert price attribute value to string for comparison
        const priceValue = String(price.attributes[key] || '');
        return priceValue === value;
      });
    }) || null;
  };
  
  const isOptionAvailable = (optionName: string, value: string): boolean => {
    if (!product) return false;
    
    console.log(`Checking if option ${optionName}=${value} is available`);
    
    // If the product has direct variants
    if (product.variants && product.variants.length > 0) {
      const otherOptions = { ...selectedOptions };
      delete otherOptions[optionName];
      
      return product.variants.some(variant => {
        if (!variant.attributes) return false;
        
        const variantValue = String(variant.attributes[optionName] || '');
        if (variantValue !== value) return false;
        
        return Object.entries(otherOptions).every(([key, val]) => {
          const matchValue = String(variant.attributes?.[key] || '');
          return matchValue === val;
        });
      });
    }
    
    // If the product has variant_combination_prices
    if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
      const otherOptions = { ...selectedOptions };
      delete otherOptions[optionName];
      
      return product.variant_combination_prices.some(price => {
        if (!price.attributes) return false;
        
        const priceValue = String(price.attributes[optionName] || '');
        if (priceValue !== value) return false;
        
        return Object.entries(otherOptions).every(([key, val]) => {
          const matchValue = String(price.attributes?.[key] || '');
          return matchValue === val;
        });
      });
    }
    
    // Default to true if product doesn't have variants
    return true;
  };
  
  const handleOptionChange = (optionName: string, value: string) => {
    console.log(`Changing option ${optionName} to ${value}`);
    setSelectedOptions(prev => ({
      ...prev,
      [optionName]: value
    }));
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
    
    if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
      const combinationPrices = product.variant_combination_prices
        .map(price => price.monthly_price || 0)
        .filter(price => price > 0);
      
      if (combinationPrices.length > 0) {
        const minCombinationPrice = Math.min(...combinationPrices);
        if (minCombinationPrice > 0 && (minPrice === 0 || minCombinationPrice < minPrice)) {
          minPrice = minCombinationPrice;
        }
      }
    }
    
    return minPrice;
  };
  
  const getSelectedSpecifications = (): Record<string, string | number> => {
    const baseSpecs = selectedVariant?.specifications || product?.specifications || {};
    
    // Merge base specs with selected options
    return {
      ...baseSpecs,
      ...selectedOptions
    };
  };
  
  const getAccurateVariantsCount = (): number => {
    if (!product) return 0;
    
    if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
      return product.variant_combination_prices.length;
    }
    
    if (product.variants && product.variants.length > 0) {
      return product.variants.length;
    }
    
    return 0;
  };
  
  // Determine if an attribute has multiple options available
  const hasAttributeOptions = (attributeName: string): boolean => {
    console.log(`Checking if attribute ${attributeName} has options:`, variationAttributes[attributeName]);
    return variationAttributes[attributeName] && variationAttributes[attributeName].length > 0;
  };
  
  // Get available options for a specific attribute
  const getOptionsForAttribute = (attributeName: string): string[] => {
    return variationAttributes[attributeName] || [];
  };
  
  return {
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
    totalPrice: calculateTotalPrice(),
    minMonthlyPrice: getMinimumMonthlyPrice(),
    specifications: getSelectedSpecifications(),
    hasVariants: product?.variants?.length > 0 || (product?.variant_combination_prices && product?.variant_combination_prices.length > 0),
    hasOptions: product?.variation_attributes && Object.keys(product?.variation_attributes || {}).length > 0,
    variantsCount: getAccurateVariantsCount(),
    variationAttributes,
    hasAttributeOptions,
    getOptionsForAttribute
  };
};
