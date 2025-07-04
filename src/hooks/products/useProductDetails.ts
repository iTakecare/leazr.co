
import { useState, useEffect, useMemo } from 'react';
import { useProductById } from './useProductById';
import { Product } from '@/types/catalog';
import { getProductPrice, getMinimumMonthlyPrice } from '@/utils/productPricing';

export const useProductDetails = (productId: string | undefined) => {
  const { product, isLoading, error } = useProductById(productId);
  const [quantity, setQuantity] = useState(1);
  // Durée fixée à 36 mois
  const [duration] = useState(36);
  const [isRequestFormOpen, setIsRequestFormOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [currentImage, setCurrentImage] = useState<string | undefined>(undefined);

  // On garde cette valeur pour l'affichage statique
  const availableDurations = [36]; // Contrat uniquement de 36 mois

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

  // Calculate current price using centralized logic
  const currentPrice = useMemo(() => {
    if (!product) return 0;
    
    const priceData = getProductPrice(product, selectedOptions);
    console.log(`useProductDetails: Current price for ${product.name}:`, priceData.monthlyPrice);
    return priceData.monthlyPrice;
  }, [product, selectedOptions]);

  // Calculate the minimum monthly price using centralized logic
  const minMonthlyPrice = useMemo(() => {
    if (!product) return 0;
    
    const minPrice = getMinimumMonthlyPrice(product);
    console.log(`useProductDetails: Min monthly price for ${product.name}:`, minPrice);
    return minPrice;
  }, [product]);

  // Calculate total price based on quantity and duration (duration is now fixed)
  const totalPrice = useMemo(() => {
    console.log(`useProductDetails: Calculating total price, currentPrice=${currentPrice}, quantity=${quantity}`);
    return currentPrice * quantity;
  }, [currentPrice, quantity]);

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
