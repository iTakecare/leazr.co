import { useState, useEffect, useMemo } from 'react';
import { useProductById } from './useProductById';
import { Product } from '@/types/catalog';
import { getClientProductPrice, getClientMinimumMonthlyPrice } from '@/utils/clientProductPricing';

export const useClientProductDetails = (productId: string | undefined, clientId: string) => {
  const { product, isLoading, error } = useProductById(productId);
  const [quantity, setQuantity] = useState(1);
  const [duration] = useState(36);
  const [isRequestFormOpen, setIsRequestFormOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [currentImage, setCurrentImage] = useState<string | undefined>(undefined);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [minMonthlyPrice, setMinMonthlyPrice] = useState(0);
  const [hasCustomPricing, setHasCustomPricing] = useState(false);
  const [originalPrice, setOriginalPrice] = useState<number | undefined>(undefined);

  const availableDurations = [36];

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

  // Calculate current price with client custom pricing
  useEffect(() => {
    if (!product || !clientId) return;

    const calculateClientPrice = async () => {
      try {
        const priceData = await getClientProductPrice(product, clientId, selectedOptions);
        setCurrentPrice(priceData.monthlyPrice);
        setHasCustomPricing(priceData.hasCustomPricing);
        setOriginalPrice(priceData.originalPrice);
        
        console.log(`useClientProductDetails: Client price for ${product.name}:`, {
          currentPrice: priceData.monthlyPrice,
          hasCustomPricing: priceData.hasCustomPricing,
          originalPrice: priceData.originalPrice
        });
      } catch (error) {
        console.error('Error calculating client price:', error);
        // Fallback to standard pricing
        const { getProductPrice } = await import('@/utils/productPricing');
        const standardPrice = getProductPrice(product, selectedOptions);
        setCurrentPrice(standardPrice.monthlyPrice);
        setHasCustomPricing(false);
      }
    };

    calculateClientPrice();
  }, [product, clientId, selectedOptions]);

  // Calculate minimum price with client custom pricing
  useEffect(() => {
    if (!product || !clientId) return;

    const calculateClientMinPrice = async () => {
      try {
        const minPrice = await getClientMinimumMonthlyPrice(product, clientId);
        setMinMonthlyPrice(minPrice);
        
        console.log(`useClientProductDetails: Client min price for ${product.name}:`, minPrice);
      } catch (error) {
        console.error('Error calculating client min price:', error);
        // Fallback to standard minimum price
        const { getMinimumMonthlyPrice } = await import('@/utils/productPricing');
        const standardMinPrice = getMinimumMonthlyPrice(product);
        setMinMonthlyPrice(standardMinPrice);
      }
    };

    calculateClientMinPrice();
  }, [product, clientId]);

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
      
      return Object.entries(selectedOptions).every(([key, value]) => {
        return variant.selected_attributes?.[key] === value;
      });
    }) || null;
  }, [product, selectedOptions]);

  // Calculate total price based on quantity
  const totalPrice = useMemo(() => {
    console.log(`useClientProductDetails: Calculating total price, currentPrice=${currentPrice}, quantity=${quantity}`);
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
    availableDurations,
    hasCustomPricing,
    originalPrice
  };
};