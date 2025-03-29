import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Product, ProductVariationAttributes } from '@/types/catalog';
import { getProductById } from '@/services/catalogService';
import { supabase } from '@/integrations/supabase/client';

const globalImageCache: Record<string, string[]> = {};

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
  const [duration] = useState(24);
  const [productImages, setProductImages] = useState<string[]>([]);

  const imagesLoadedRef = useRef(false);
  const productIdRef = useRef<string | null>(null);
  const imageLoadingRef = useRef(false);
  const requestCounterRef = useRef(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productId ? getProductById(productId) : null,
    enabled: !!productId,
  });

  const loadProductImages = useCallback(async (id: string): Promise<string[]> => {
    if (imageLoadingRef.current && id === productIdRef.current) {
      return [];
    }
    
    if (globalImageCache[id]?.length > 0) {
      return globalImageCache[id];
    }
    
    try {
      imageLoadingRef.current = true;
      productIdRef.current = id;
      requestCounterRef.current++;
      
      const { data: files, error } = await supabase
        .storage
        .from("product-images")
        .list(id, {
          sortBy: { column: 'name', order: 'asc' }
        });
      
      if (error) {
        console.error("Error loading product images from storage:", error);
        imageLoadingRef.current = false;
        return [];
      }
      
      const imageFiles = files.filter(file => 
        !file.name.startsWith('.') && 
        !file.name.endsWith('/') &&
        file.name !== '.emptyFolderPlaceholder'
      );
      
      if (imageFiles.length === 0) {
        console.log("No images found in storage for product", id);
        imageLoadingRef.current = false;
        return [];
      }
      
      const timestamp = Date.now();
      const imageUrls = imageFiles.map(file => {
        const { data } = supabase
          .storage
          .from("product-images")
          .getPublicUrl(`${id}/${file.name}`);
        
        if (!data || !data.publicUrl) {
          console.error(`Failed to get public URL for ${file.name}`);
          return null;
        }
        
        const url = `${data.publicUrl}?t=${timestamp}`;
        return url;
      }).filter(Boolean) as string[];
      
      globalImageCache[id] = imageUrls;
      
      console.log(`Generated ${imageUrls.length} image URLs for product ${id}`);
      imageLoadingRef.current = false;
      return imageUrls;
    } catch (err) {
      console.error("Error in loadProductImages:", err);
      imageLoadingRef.current = false;
      return [];
    }
  }, []);

  const getValidImages = useCallback(async (prod: Product | null): Promise<string[]> => {
    if (!prod || !productId) return [];
    
    if (productImages.length > 0 && imagesLoadedRef.current && productId === productIdRef.current) {
      return productImages;
    }
    
    console.log("Loading images for product", productId, "from product-images bucket");
    
    const storageImages = await loadProductImages(productId);
    if (storageImages.length > 0) {
      console.log("Using images from storage:", storageImages);
      setProductImages(storageImages);
      imagesLoadedRef.current = true;
      return storageImages;
    }
    
    console.log("No storage images found, falling back to product object images");
    
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
    
    if (isValidImage(prod.image_url as string)) {
      validImages.push(prod.image_url as string);
      seenUrls.add(prod.image_url as string);
    }
    
    if (isValidImage(prod.imageUrl as string) && !seenUrls.has(prod.imageUrl as string)) {
      validImages.push(prod.imageUrl as string);
      seenUrls.add(prod.imageUrl as string);
    }
    
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
    
    checkAndAddImages(prod.image_urls as any[]);
    checkAndAddImages(prod.imageUrls as any[]);
    checkAndAddImages(prod.images as any[]);
    
    console.log("Found valid images from product object:", validImages);
    
    setProductImages(validImages);
    imagesLoadedRef.current = true;
    return validImages;
  }, [productId, loadProductImages, productImages]);

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
    
    if (productId !== productIdRef.current) {
      imagesLoadedRef.current = false;
      productIdRef.current = productId;
    }
    
    const loadImages = async () => {
      const validImages = await getValidImages(data);
      
      if (validImages.length > 0 && !currentImage) {
        setCurrentImage(validImages[0]);
      } else if (validImages.length === 0) {
        setCurrentImage(null);
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
  }, [data, isLoading, isError, productId, getValidImages, currentImage]);

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
    loadProductImages,
    productImages
  };
}
