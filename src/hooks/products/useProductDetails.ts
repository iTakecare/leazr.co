
import { useState, useEffect, useMemo } from 'react';
import { useProductById } from './useProductById';
import { Product } from '@/types/catalog';

export const useProductDetails = (productId: string | undefined) => {
  const { product, isLoading, error } = useProductById(productId);
  const [quantity, setQuantity] = useState(1);
  const [duration, setDuration] = useState(24); // Default to 24 months
  const [isRequestFormOpen, setIsRequestFormOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [currentImage, setCurrentImage] = useState<string | undefined>(undefined);

  // Available durations for contract length
  const availableDurations = [12, 24, 36, 48, 60];

  // Set initial image when product loads
  useEffect(() => {
    if (product) {
      setCurrentImage(product.image_url);
    }
  }, [product]);

  // Set initial options when product loads
  useEffect(() => {
    if (product && product.variation_attributes) {
      const initialOptions: Record<string, string> = {};
      
      Object.entries(product.variation_attributes).forEach(([key, values]) => {
        if (Array.isArray(values) && values.length > 0) {
          initialOptions[key] = values[0];
        }
      });
      
      setSelectedOptions(initialOptions);
    }
  }, [product]);

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1) {
      setQuantity(newQuantity);
    }
  };

  const handleOptionChange = (optionName: string, value: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [optionName]: value
    }));
  };

  // Find matching variant based on selected options
  const selectedVariant = useMemo(() => {
    if (!product || !product.variants || product.variants.length === 0) {
      return null;
    }

    return product.variants.find(variant => {
      if (!variant.selected_attributes) return false;
      
      // Check if all selected options match this variant
      return Object.entries(selectedOptions).every(([key, value]) => {
        return variant.selected_attributes?.[key] === value;
      });
    }) || null;
  }, [product, selectedOptions]);

  // Calculate current price based on selected variant or base product
  const currentPrice = useMemo(() => {
    if (selectedVariant && selectedVariant.monthly_price) {
      return selectedVariant.monthly_price;
    }
    
    // If no variant is selected but we have a parent with variant combination prices
    if (product && product.variant_combination_prices && product.variant_combination_prices.length > 0) {
      // Try to find a price that matches the selected options
      const matchingPrice = product.variant_combination_prices.find(combo => {
        if (!combo.attributes) return false;
        
        return Object.entries(selectedOptions).every(([key, value]) => 
          combo.attributes[key] === value
        );
      });
      
      if (matchingPrice) {
        return matchingPrice.monthly_price || 0;
      }
    }
    
    return product?.monthly_price || 0;
  }, [product, selectedVariant, selectedOptions]);

  // Calculate the minimum monthly price for display
  const minMonthlyPrice = useMemo(() => {
    if (!product) return 0;
    
    if (product.variants && product.variants.length > 0) {
      const prices = product.variants
        .map(variant => variant.monthly_price || 0)
        .filter(price => price > 0);
      
      if (prices.length > 0) {
        return Math.min(...prices);
      }
    }
    
    if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
      const prices = product.variant_combination_prices
        .map(combo => combo.monthly_price || 0)
        .filter(price => price > 0);
      
      if (prices.length > 0) {
        return Math.min(...prices);
      }
    }
    
    return product.monthly_price || 0;
  }, [product]);

  // Calculate total price based on quantity and duration
  const totalPrice = useMemo(() => {
    // Apply a discount based on duration if needed
    let durationFactor = 1;
    if (duration >= 48) {
      durationFactor = 0.9; // 10% discount for longer durations (48+ months)
    } else if (duration >= 36) {
      durationFactor = 0.95; // 5% discount for medium durations (36 months)
    } else if (duration < 24) {
      durationFactor = 1.1; // 10% surcharge for shorter durations (12 months)
    }
    
    return currentPrice * quantity * durationFactor;
  }, [currentPrice, quantity, duration]);

  const specifications = useMemo(() => {
    return product?.specifications || {};
  }, [product]);

  const variationAttributes = useMemo(() => {
    return product?.variation_attributes || {};
  }, [product]);

  const hasVariants = useMemo(() => {
    return !!(
      product?.is_parent || 
      (product?.variant_combination_prices && product?.variant_combination_prices.length > 0) ||
      (product?.variants && product?.variants.length > 0)
    );
  }, [product]);

  const hasOptions = useMemo(() => {
    if (!product?.variation_attributes) return false;
    return Object.keys(product.variation_attributes).length > 0;
  }, [product]);

  const isOptionAvailable = (optionName: string, value: string) => {
    // Simple implementation - all options are available
    return true;
  };

  const hasAttributeOptions = (attributeName: string) => {
    return !!(variationAttributes[attributeName] && variationAttributes[attributeName].length > 0);
  };

  const getOptionsForAttribute = (attributeName: string) => {
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
  };
};
