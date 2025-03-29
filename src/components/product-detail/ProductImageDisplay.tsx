
import React, { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, ArrowRight, ZoomIn } from "lucide-react";
import { toast } from "sonner";

interface ProductImageDisplayProps {
  imageUrl: string;
  altText: string;
  imageUrls?: string[];
}

const ProductImageDisplay: React.FC<ProductImageDisplayProps> = ({ 
  imageUrl, 
  altText,
  imageUrls = []
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [allImages, setAllImages] = useState<string[]>([]);
  
  // References for component lifecycle
  const isMounted = useRef(true);
  const loadedImages = useRef<Set<string>>(new Set());
  const initializingRef = useRef(false);
  const lastLoadingTime = useRef<number>(0);

  // Process and deduplicate images
  useEffect(() => {
    if (initializingRef.current) return;
    initializingRef.current = true;
    
    try {
      const validImages: string[] = [];
      const seenUrls = new Set<string>();
      
      const isValidImageUrl = (url: string | null | undefined): boolean => {
        if (!url || typeof url !== 'string' || url.trim() === '') return false;
        if (url === '/placeholder.svg') return false;
        
        return !(
          url.includes('.emptyFolderPlaceholder') || 
          url.split('/').pop()?.startsWith('.') ||
          url.includes('undefined') ||
          url.endsWith('/')
        );
      };
      
      // Process main image first
      if (isValidImageUrl(imageUrl)) {
        const baseUrl = imageUrl.split('?')[0];
        seenUrls.add(baseUrl);
        validImages.push(imageUrl);
      }
      
      // Process other images
      if (Array.isArray(imageUrls)) {
        imageUrls.forEach(url => {
          if (isValidImageUrl(url)) {
            const baseUrl = url.split('?')[0];
            if (!seenUrls.has(baseUrl)) {
              seenUrls.add(baseUrl);
              validImages.push(url);
            }
          }
        });
      }
      
      setAllImages(validImages);
      initializingRef.current = false;
    } catch (err) {
      console.error("Error processing images:", err);
      initializingRef.current = false;
    }
  }, [imageUrl, imageUrls]);
  
  // Set initial image once allImages is populated
  useEffect(() => {
    if (allImages.length === 0) {
      setSelectedImage('/placeholder.svg');
      setIsLoading(false);
      setHasError(true);
      return;
    }
    
    const initialImage = allImages[0];
    setSelectedImage(addCacheBuster(initialImage));
    setCurrentIndex(0);
    setIsLoading(true);
    lastLoadingTime.current = Date.now();
  }, [allImages]);
  
  // Cleanup function
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Add cache buster to URLs
  const addCacheBuster = useCallback((url: string): string => {
    if (!url || url === '/placeholder.svg') return '/placeholder.svg';
    
    try {
      const baseUrl = url.split('?')[0];
      const timestamp = Date.now();
      return `${baseUrl}?t=${timestamp}`;
    } catch (e) {
      return url || '/placeholder.svg';
    }
  }, []);

  // Handle successful image load
  const handleImageLoad = useCallback(() => {
    if (!isMounted.current) return;
    
    const loadTime = Date.now() - lastLoadingTime.current;
    console.log(`Image loaded in ${loadTime}ms`);
    
    setIsLoading(false);
    setHasError(false);
    
    if (selectedImage) {
      const baseUrl = selectedImage.split('?')[0];
      loadedImages.current.add(baseUrl);
    }
  }, [selectedImage]);

  // Handle image loading error
  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    if (!isMounted.current) return;
    
    console.error("Error loading image:", (e.target as HTMLImageElement).src);
    
    setIsLoading(false);
    setHasError(true);
    
    // Don't try reload placeholder
    if (selectedImage === '/placeholder.svg') return;
    
    const baseUrl = selectedImage?.split('?')[0] || '';
    
    // Only retry once
    if (!loadedImages.current.has(baseUrl)) {
      setTimeout(() => {
        if (isMounted.current) {
          const refreshedUrl = addCacheBuster(baseUrl);
          setSelectedImage(refreshedUrl);
          setIsLoading(true);
          lastLoadingTime.current = Date.now();
        }
      }, 1000);
    } else {
      setSelectedImage('/placeholder.svg');
    }
  }, [selectedImage, addCacheBuster]);
  
  // Handle thumbnail click
  const handleThumbnailClick = useCallback((url: string, index: number) => {
    if (currentIndex === index) return;
    
    setSelectedImage(addCacheBuster(url));
    setCurrentIndex(index);
    setIsLoading(true);
    setHasError(false);
    lastLoadingTime.current = Date.now();
  }, [currentIndex, addCacheBuster]);

  // Navigation between images
  const navigateImage = useCallback((direction: 'prev' | 'next') => {
    if (allImages.length <= 1) return;
    
    let newIndex = currentIndex;
    
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : allImages.length - 1;
    } else {
      newIndex = currentIndex < allImages.length - 1 ? currentIndex + 1 : 0;
    }
    
    if (newIndex === currentIndex) return;
    
    setSelectedImage(addCacheBuster(allImages[newIndex]));
    setCurrentIndex(newIndex);
    setIsLoading(true);
    setHasError(false);
    lastLoadingTime.current = Date.now();
  }, [allImages, currentIndex, addCacheBuster]);

  // Display fallback if no images
  if (allImages.length === 0) {
    return (
      <div className="flex flex-col-reverse md:flex-row md:gap-4">
        <div className="flex-1 relative">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md relative group">
            <div className="relative w-full aspect-square sm:aspect-[4/3] md:aspect-[3/2] flex items-center justify-center p-4">
              <div className="text-center text-gray-500">
                <img 
                  src="/placeholder.svg"
                  alt={altText}
                  className="max-w-full max-h-full object-contain mx-auto"
                />
                <div className="mt-2 text-sm">Image non disponible</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse md:flex-row md:gap-4">
      {allImages.length > 1 && (
        <div className="flex overflow-x-auto md:overflow-y-auto md:flex-col md:h-[400px] gap-2 mt-4 md:mt-0 md:w-24 md:min-w-24 pb-2 md:pb-0">
          {allImages.map((url, index) => {
            const thumbKey = `thumb-${index}-${url.split('/').pop()?.split('?')[0]}`;
            
            return (
              <button
                key={thumbKey}
                className={`relative min-w-16 h-16 border-2 rounded-lg transition-all 
                  ${currentIndex === index ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-gray-300'}
                  overflow-hidden flex-shrink-0`}
                onClick={() => handleThumbnailClick(url, index)}
                aria-label={`Image ${index + 1} de ${altText}`}
              >
                <img 
                  src={addCacheBuster(url)} 
                  alt={`${altText} - image ${index + 1}`}
                  className="w-full h-full object-cover object-center"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                  }}
                  loading="lazy"
                />
                {currentIndex === index && (
                  <div className="absolute inset-0 bg-indigo-500 bg-opacity-10"></div>
                )}
              </button>
            );
          })}
        </div>
      )}
      
      <div className="flex-1 relative">
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md relative group">
          <div className="relative w-full aspect-square sm:aspect-[4/3] md:aspect-[3/2] flex items-center justify-center p-4">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              </div>
            )}
            {selectedImage && (
              <img 
                key={`main-${currentIndex}-${selectedImage}`}
                src={selectedImage} 
                alt={altText}
                className="max-w-full max-h-full object-contain transition-opacity duration-300"
                style={{ opacity: isLoading ? 0 : 1 }}
                onLoad={handleImageLoad}
                onError={handleImageError}
                loading={currentIndex === 0 ? "eager" : "lazy"}
              />
            )}
            {hasError && selectedImage === '/placeholder.svg' && (
              <div className="absolute bottom-2 left-2 bg-red-50 text-red-500 text-xs px-2 py-1 rounded z-20">
                Image non disponible
              </div>
            )}
          </div>
          
          {allImages.length > 1 && (
            <>
              <button 
                onClick={() => navigateImage('prev')}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white rounded-full shadow p-2 opacity-70 hover:opacity-100 transition-opacity"
                aria-label="Image précédente"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button 
                onClick={() => navigateImage('next')}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white rounded-full shadow p-2 opacity-70 hover:opacity-100 transition-opacity"
                aria-label="Image suivante"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
        
        {allImages.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full">
            {currentIndex + 1} / {allImages.length}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductImageDisplay;
