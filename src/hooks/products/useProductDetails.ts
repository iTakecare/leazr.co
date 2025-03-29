import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { Product, ProductVariationAttributes } from '@/types/catalog';
import { getProductById, getProducts, findVariantByAttributes } from '@/services/catalogService';
import { supabase } from '@/integrations/supabase/client';

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
  
  const { data, isLoading, isError } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productId ? getProductById(productId) : null,
    enabled: !!productId,
  });

  const loadProductImages = useCallback(async (id: string): Promise<string[]> => {
    try {
      console.log(`Loading images for product ${id} from product-images bucket`);
      
      // Check if the folder exists
      const { data: files, error } = await supabase
        .storage
        .from("product-images")
        .list(id, {
          sortBy: { column: 'name', order: 'asc' }
        });
      
      if (error) {
        console.error("Error loading product images from storage:", error);
        return [];
      }
      
      const imageFiles = files.filter(file => 
        !file.name.startsWith('.') && 
        !file.name.endsWith('/') &&
        file.name !== '.emptyFolderPlaceholder'
      );
      
      if (imageFiles.length === 0) {
        console.log("No images found for product in storage bucket");
        return [];
      }
      
      // Generate direct public URLs without cache-busting parameters
      const imageUrls = imageFiles.map(file => {
        const { data } = supabase
          .storage
          .from("product-images")
          .getPublicUrl(`${id}/${file.name}`);
        
        if (!data || !data.publicUrl) {
          console.error(`Failed to get public URL for ${file.name}`);
          return null;
        }
        
        const url = data.publicUrl;
        console.log(`Generated image URL: ${url}`);
        return url;
      }).filter(Boolean) as string[];
      
      console.log("Loaded product images from storage:", imageUrls);
      return imageUrls;
    } catch (err) {
      console.error("Error in loadProductImages:", err);
      return [];
    }
  }, []);

  const getValidImages = useCallback(async (product: Product | null): Promise<string[]> => {
    if (!product || !productId) return [];
    
    // Try to load images from Supabase storage first
    const storageImages = await loadProductImages(productId);
    if (storageImages.length > 0) {
      console.log("Using images from storage:", storageImages);
      return storageImages;
    }
    
    console.log("No storage images found, falling back to product object images");
    
    // Fall back to images in the product object
    const validImages: string[] = [];
    const seenUrls = new Set<string>();
    
    const isValidImage = (url: string): boolean => {
      if (!url || 
          typeof url !== 'string' || 
          url.trim() === '' || 
          url.includes('.emptyFolderPlaceholder') || 
          url.includes('undefined') ||
          url === '/placeholder.svg' ||
          url.endsWith('/')) {
        return false;
      }
      
      return true;
    };
    
    // Check all possible image locations in the product object
    if (isValidImage(product.image_url as string)) {
      validImages.push(product.image_url as string);
      seenUrls.add(product.image_url as string);
    }
    
    if (isValidImage(product.imageUrl as string) && !seenUrls.has(product.imageUrl as string)) {
      validImages.push(product.imageUrl as string);
      seenUrls.add(product.imageUrl as string);
    }
    
    // Check image arrays
    const checkAndAddImages = (images: any[] | undefined) => {
      if (!images || !Array.isArray(images)) return;
      
      images.forEach(img => {
        const imgUrl = typeof img === 'string' ? img : (img?.src || '');
        if (isValidImage(imgUrl) && !seenUrls.has(imgUrl)) {
          validImages.push(imgUrl);
          seenUrls.add(imgUrl);
        }
      });
    };
    
    checkAndAddImages(product.image_urls as any[]);
    checkAndAddImages(product.imageUrls as any[]);
    checkAndAddImages(product.images as any[]);
    
    console.log("Found valid images from product object:", validImages);
    return validImages;
  }, [productId, loadProductImages]);

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
    
    const loadImages = async () => {
      const validImages = await getValidImages(data);
      
      if (validImages.length > 0) {
        setCurrentImage(validImages[0]);
        console.log("Setting current image to:", validImages[0]);
      } else {
        setCurrentImage(null);
        console.log("No valid images found for product");
      }
    };
    
    loadImages();

    const hasVariationAttrs = data.variation_attributes && 
      Object.keys(data.variation_attributes).length > 0;
    
    const hasVariantPrices = Array.isArray(data.variant_combination_prices) && 
      data.variant_combination_prices.length > 0;
    
    setHasVariants(hasVariationAttrs || hasVariantPrices);

    const extractedAttributes: ProductVariationAttributes = {};
    
    const variantPrices = Array.isArray(data.variant_combination_prices) 
      ? data.variant_combination_prices 
      : [];
      
    variantPrices.forEach(price => {
      if (price.attributes) {
        Object.entries(price.attributes).forEach(([key, value]) => {
          if (!extractedAttributes[key]) {
            extractedAttributes[key] = [];
          }
          
          const stringValue = String(value);
          
          if (!extractedAttributes[key].includes(stringValue)) {
            extractedAttributes[key].push(stringValue);
          }
        });
      }
    });

    if (data.variation_attributes && Object.keys(data.variation_attributes).length > 0) {
      setVariationAttributes(data.variation_attributes);
      
      const defaultOptions: Record<string, string> = {};
      Object.entries(data.variation_attributes).forEach(([key, values]) => {
        if (Array.isArray(values) && values.length > 0) {
          defaultOptions[key] = values[0];
        }
      });
      setSelectedOptions(defaultOptions);
    } 
    else if (Object.keys(extractedAttributes).length > 0) {
      setVariationAttributes(extractedAttributes);
      
      const defaultOptions: Record<string, string> = {};
      Object.entries(extractedAttributes).forEach(([key, values]) => {
        if (Array.isArray(values) && values.length > 0) {
          defaultOptions[key] = values[0];
        }
      });
      setSelectedOptions(defaultOptions);
    }
  }, [data, isLoading, isError, productId, getValidImages]);
  
  const handleOptionChange = (attributeName: string, value: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [attributeName]: value
    }));
  };
  
  const isOptionAvailable = () => true;
  
  const handleQuantityChange = (newQuantity: number) => {
    setQuantity(Math.max(1, newQuantity));
  };
  
  const getOptionsForAttribute = (attributeName: string): string[] => {
    return variationAttributes[attributeName] || [];
  };
  
  const hasAttributeOptions = (attributeName: string): boolean => {
    return !!variationAttributes[attributeName] && 
           Array.isArray(variationAttributes[attributeName]) && 
           variationAttributes[attributeName].length > 0;
  };
  
  const currentPrice = selectedVariant?.price || product?.price || 0;
  
  const specifications = product?.specifications || {};
  
  const hasOptions = Object.keys(variationAttributes).length > 0;
  
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
    
    return currentPrice / duration;
  };
  
  const minMonthlyPrice = calculateMinMonthlyPrice();
  
  const totalPrice = (selectedVariant?.monthly_price || product?.monthly_price || ((selectedVariant?.price || product?.price || 0) / duration)) * quantity;

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
    isLoading: loading,
    getValidImages,
    loadProductImages
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
