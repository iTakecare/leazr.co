import React, { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, ArrowRight, ZoomIn } from "lucide-react";

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
  const imageProcessedRef = useRef(true);
  const initialRenderRef = useRef(true);
  const processingRef = useRef(false);
  const imagesRef = useRef<string[]>([]);
  
  const processImageUrl = useCallback((url: string): string => {
    if (!url || url === '/placeholder.svg') return "/placeholder.svg";
    
    try {
      const baseUrl = url.split('?')[0];
      
      if (!baseUrl.includes('t=')) {
        return `${baseUrl}?t=${Date.now()}`;
      }
      
      return url;
    } catch (e) {
      return url || "/placeholder.svg";
    }
  }, []);
  
  useEffect(() => {
    if (processingRef.current) return;
    processingRef.current = true;
    
    console.log("ProductImageDisplay - Processing images", { imageUrl, imageUrlsLength: imageUrls?.length });
    
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
    
    const uniqueUrlsMap = new Map<string, string>();
    
    if (isValidImageUrl(imageUrl)) {
      const baseMainUrl = imageUrl.split('?')[0];
      uniqueUrlsMap.set(baseMainUrl, imageUrl);
    }
    
    if (Array.isArray(imageUrls)) {
      imageUrls.forEach(url => {
        if (isValidImageUrl(url)) {
          const baseUrl = url.split('?')[0];
          uniqueUrlsMap.set(baseUrl, url);
        }
      });
    }
    
    const validImages = Array.from(uniqueUrlsMap.values());
    console.log("ProductImageDisplay - Available images:", validImages);
    
    if (JSON.stringify(validImages) !== JSON.stringify(imagesRef.current)) {
      imagesRef.current = validImages;
      setAllImages(validImages);
      
      if (validImages.length > 0) {
        const firstImage = processImageUrl(validImages[0]);
        console.log("ProductImageDisplay - Setting initial image:", firstImage);
        setSelectedImage(firstImage);
        setCurrentIndex(0);
        setIsLoading(true);
      } else {
        setSelectedImage('/placeholder.svg');
        setIsLoading(false);
        setHasError(true);
      }
    }
    
    processingRef.current = false;
  }, [imageUrl, imageUrls, processImageUrl]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
    console.log("ProductImageDisplay - Image loaded successfully:", selectedImage);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.log("ProductImageDisplay - Error loading image:", selectedImage);
    setIsLoading(false);
    setHasError(true);
    
    const imgElement = e.target as HTMLImageElement;
    const baseUrl = imgElement.src.split('?')[0];
    
    if (imgElement.src !== '/placeholder.svg' && baseUrl !== '/placeholder.svg') {
      setTimeout(() => {
        if (mounted.current) {
          imgElement.src = `${baseUrl}?t=${Date.now()}`;
        }
      }, 500);
    } else {
      imgElement.src = '/placeholder.svg';
    }
  };
  
  const mounted = useRef(true);
  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);
  
  const handleThumbnailClick = (url: string, index: number) => {
    if (currentIndex === index) return;
    
    console.log("ProductImageDisplay - Thumbnail clicked:", url);
    setSelectedImage(processImageUrl(url));
    setCurrentIndex(index);
    setIsLoading(true);
    setHasError(false);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (allImages.length <= 1) return;
    
    let newIndex = currentIndex;
    
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : allImages.length - 1;
    } else {
      newIndex = currentIndex < allImages.length - 1 ? currentIndex + 1 : 0;
    }
    
    if (newIndex === currentIndex) return;
    
    console.log(`ProductImageDisplay - Navigating ${direction} to image at index ${newIndex}`);
    setCurrentIndex(newIndex);
    setSelectedImage(processImageUrl(allImages[newIndex]));
    setIsLoading(true);
    setHasError(false);
  };

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
            const urlParts = url.split('/');
            const fileName = urlParts[urlParts.length - 1].split('?')[0];
            const key = `thumb-${index}-${fileName}`;
            
            return (
              <button
                key={key}
                className={`relative min-w-16 h-16 border-2 rounded-lg transition-all 
                  ${currentIndex === index ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-gray-300'}
                  overflow-hidden flex-shrink-0`}
                onClick={() => handleThumbnailClick(url, index)}
              >
                <img 
                  src={processImageUrl(url)} 
                  alt={`${altText} - image ${index + 1}`}
                  className="w-full h-full object-cover object-center"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                  }}
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
                className={`max-w-full max-h-full object-contain transition-all duration-300 
                  ${isLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            )}
            {hasError && (
              <div className="absolute bottom-2 left-2 bg-red-50 text-red-500 text-xs px-2 py-1 rounded z-20">
                Image non disponible
              </div>
            )}
            
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-black bg-opacity-40 rounded-full p-2">
                <ZoomIn className="h-6 w-6 text-white" />
              </div>
            </div>
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
