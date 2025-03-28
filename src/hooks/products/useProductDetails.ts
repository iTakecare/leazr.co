import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Product, ProductVariationAttributes } from '@/types/catalog';
import { getProductById, getProducts, findVariantByAttributes } from '@/services/catalogService';

export function useProductDetails(productId: string | null) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [variationAttributes, setVariationAttributes] = useState<ProductVariationAttributes>({});
  const [hasVariants, setHasVariants] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [isRequestFormOpen, setIsRequestFormOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Product | null>(null);
  const [duration] = useState(24); // Default lease duration in months
  
  // Fetch product data
  const { data, isLoading, isError } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productId ? getProductById(productId) : null,
    enabled: !!productId,
  });

  // Filter out invalid images from a product
  const getValidImages = (product: Product | null): string[] => {
    if (!product) return [];
    
    const validImages: string[] = [];
    const seenUrls = new Set<string>();
    
    // Check main image
    if (product.image_url && 
        typeof product.image_url === 'string' && 
        product.image_url.trim() !== '' && 
        !product.image_url.includes('.emptyFolderPlaceholder') && 
        !product.image_url.includes('undefined') &&
        product.image_url !== '/placeholder.svg') {
      validImages.push(product.image_url);
      seenUrls.add(product.image_url);
    }
    
    // Check additional images
    if (product.image_urls && Array.isArray(product.image_urls)) {
      product.image_urls.forEach(url => {
        if (url && 
            typeof url === 'string' && 
            url.trim() !== '' && 
            !url.includes('.emptyFolderPlaceholder') && 
            !url.includes('undefined') &&
            url !== '/placeholder.svg' && 
            !seenUrls.has(url)) {
          validImages.push(url);
          seenUrls.add(url);
        }
      });
    }
    
    return validImages;
  };

  useEffect(() => {
    if (isLoading) {
      setLoading(true);
      return;
    }

    if (isError) {
      setLoading(false);
      setError('Failed to fetch product data');
      return;
    }

    if (!data) {
      setLoading(false);
      setError('Product not found');
      return;
    }

    setProduct(data);
    setLoading(false);
    setError(null);
    
    // Get valid images
    const validImages = getValidImages(data);
    console.log("Valid images for product:", validImages);
    
    // Set the current image (only set if there are valid images)
    if (validImages.length > 0) {
      setCurrentImage(validImages[0]);
      console.log("Setting current image to:", validImages[0]);
    } else {
      setCurrentImage(null);
      console.log("No valid images found for product");
    }

    // Check if product has variants
    const hasVariationAttrs = data.variation_attributes && 
      Object.keys(data.variation_attributes).length > 0;
    
    const hasVariantPrices = Array.isArray(data.variant_combination_prices) && 
      data.variant_combination_prices.length > 0;
    
    setHasVariants(hasVariationAttrs || hasVariantPrices);

    // Extract variation attributes from variant combination prices if not directly provided
    const extractedAttributes: ProductVariationAttributes = {};
    
    // Ensure variant_combination_prices is an array before processing
    const variantPrices = Array.isArray(data.variant_combination_prices) 
      ? data.variant_combination_prices 
      : [];
      
    variantPrices.forEach(price => {
      if (price.attributes) {
        Object.entries(price.attributes).forEach(([key, value]) => {
          if (!extractedAttributes[key]) {
            extractedAttributes[key] = [];
          }
          
          // Convert value to string to ensure consistent handling
          const stringValue = String(value);
          
          // Check if this value is already in the array
          if (!extractedAttributes[key].includes(stringValue)) {
            extractedAttributes[key].push(stringValue);
          }
        });
      }
    });

    // If the product already has defined variation_attributes, use those
    if (data.variation_attributes && Object.keys(data.variation_attributes).length > 0) {
      setVariationAttributes(data.variation_attributes);
      
      // Set default selected options based on first available value for each attribute
      const defaultOptions: Record<string, string> = {};
      Object.entries(data.variation_attributes).forEach(([key, values]) => {
        if (Array.isArray(values) && values.length > 0) {
          defaultOptions[key] = values[0];
        }
      });
      setSelectedOptions(defaultOptions);
    } 
    // Otherwise use the extracted ones
    else if (Object.keys(extractedAttributes).length > 0) {
      setVariationAttributes(extractedAttributes);
      
      // Set default selected options based on first available value for each attribute
      const defaultOptions: Record<string, string> = {};
      Object.entries(extractedAttributes).forEach(([key, values]) => {
        if (Array.isArray(values) && values.length > 0) {
          defaultOptions[key] = values[0];
        }
      });
      setSelectedOptions(defaultOptions);
    }
  }, [data, isLoading, isError]);
  
  // Handle option changes (e.g., color, size, etc.)
  const handleOptionChange = (attributeName: string, value: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [attributeName]: value
    }));
  };
  
  // Check if a specific attribute option is available based on selected attributes
  const isOptionAvailable = (attributeName: string, optionValue: string): boolean => {
    // Basic implementation - in a real app, this would check compatibility with other selected options
    return true;
  };
  
  // Handle quantity changes
  const handleQuantityChange = (newQuantity: number) => {
    setQuantity(Math.max(1, newQuantity)); // Ensure quantity is at least 1
  };
  
  // Get attributes options for a specific attribute
  const getOptionsForAttribute = (attributeName: string): string[] => {
    return variationAttributes[attributeName] || [];
  };
  
  // Check if product has attribute options for a specific attribute
  const hasAttributeOptions = (attributeName: string): boolean => {
    return !!variationAttributes[attributeName] && 
           Array.isArray(variationAttributes[attributeName]) && 
           variationAttributes[attributeName].length > 0;
  };
  
  // Compute the current price based on selected options
  const currentPrice = selectedVariant?.price || product?.price || 0;
  
  // Calculate the product specifications from the product data
  const specifications = product?.specifications || {};
  
  // Calculate if the product has any options
  const hasOptions = Object.keys(variationAttributes).length > 0;
  
  // Calculate minimum monthly price (for display in the UI)
  const calculateMinMonthlyPrice = (): number => {
    if (product?.monthly_price) {
      return product.monthly_price;
    }
    
    if (Array.isArray(product?.variant_combination_prices) && product.variant_combination_prices.length > 0) {
      const monthlyPrices = product.variant_combination_prices
        .map(v => v.monthly_price || 0)
        .filter(p => p > 0);
        
      if (monthlyPrices.length > 0) {
        return Math.min(...monthlyPrices);
      }
    }
    
    // Default fallback
    return currentPrice / duration;
  };
  
  const minMonthlyPrice = calculateMinMonthlyPrice();
  
  // Calculate total monthly price based on selected options and quantity
  const totalPrice = (selectedVariant?.monthly_price || product?.monthly_price || (currentPrice / duration)) * quantity;

  return {
    product,
    loading,
    error,
    variationAttributes,
    hasVariants,
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
    hasOptions,
    hasAttributeOptions,
    getOptionsForAttribute,
    quantity,
    handleQuantityChange,
    isRequestFormOpen,
    setIsRequestFormOpen,
    isLoading: loading, // Alias loading as isLoading for compatibility with ProductDetailPage
    getValidImages,
  };
}

export function useProductsList() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts(),
  });

  return {
    products: data || [],
    loading: isLoading,
    error: isError ? error || 'Failed to fetch products' : null,
  };
}
