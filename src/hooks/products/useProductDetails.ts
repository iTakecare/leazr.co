
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProductById } from "@/services/catalogService";
import { Product } from "@/types/catalog";

export const useProductDetails = (productId: string | undefined) => {
  const [quantity, setQuantity] = useState(1);
  const [isRequestFormOpen, setIsRequestFormOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [currentImage, setCurrentImage] = useState<string>("");
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Product | null>(null);
  const duration = 36; // Fixed duration to 36 months
  
  // Fetch product data
  const { data: product, isLoading, error } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => getProductById(productId || ""),
    enabled: !!productId,
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
    hasVariants: product?.variants && product?.variants.length > 0,
    hasOptions: product?.variation_attributes && Object.keys(product?.variation_attributes || {}).length > 0,
  };
};
