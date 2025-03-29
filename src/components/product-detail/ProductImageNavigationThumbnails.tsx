
import React, { useState } from "react";
import { cleanImageUrl } from "./utils/imageUtils";

interface ProductImageNavigationThumbnailsProps {
  images: string[];
  currentIndex: number;
  onThumbnailClick: (url: string, index: number) => void;
  addTimestamp: (url: string) => string;
}

const ProductImageNavigationThumbnails: React.FC<ProductImageNavigationThumbnailsProps> = ({
  images,
  currentIndex,
  onThumbnailClick,
  addTimestamp
}) => {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});
  
  if (images.length <= 1) {
    return null;
  }

  const handleImageError = (url: string) => {
    console.log("Thumbnail failed to load:", url);
    setImageErrors(prev => ({
      ...prev,
      [url]: true
    }));
    setLoadingImages(prev => ({
      ...prev,
      [url]: false
    }));
  };
  
  const handleImageLoad = (url: string) => {
    setLoadingImages(prev => ({
      ...prev,
      [url]: false
    }));
  };
  
  // Function to mark image as loading when it starts loading
  const setImageLoading = (url: string) => {
    if (loadingImages[url] === undefined) {
      setLoadingImages(prev => ({
        ...prev,
        [url]: true
      }));
    }
    return url;
  };
  
  return (
    <div className="flex overflow-x-auto md:overflow-y-auto md:flex-col md:h-[400px] gap-2 mt-4 md:mt-0 md:w-24 md:min-w-24 pb-2 md:pb-0">
      {images.map((url, index) => {
        // Clean URL to prevent double slashes and other issues
        const cleanedUrl = cleanImageUrl(url);
        // Mark the image as loading
        setImageLoading(cleanedUrl);
        // Use placeholder if error
        const imageUrl = imageErrors[cleanedUrl] ? "/placeholder.svg" : cleanedUrl;
        
        return (
          <button
            key={`thumb-${index}-${url}`}
            className={`relative min-w-16 h-16 border-2 rounded-lg transition-all 
              ${currentIndex === index ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-gray-300'}
              overflow-hidden flex-shrink-0`}
            onClick={() => onThumbnailClick(url, index)}
            aria-label={`Voir image ${index + 1}`}
          >
            {loadingImages[cleanedUrl] && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              </div>
            )}
            
            <img 
              src={imageUrl} 
              alt={`Thumbnail ${index + 1}`}
              className="w-full h-full object-cover object-center"
              onError={() => handleImageError(cleanedUrl)}
              onLoad={() => handleImageLoad(cleanedUrl)}
              loading="lazy"
            />
            
            {currentIndex === index && (
              <div className="absolute inset-0 bg-indigo-500 bg-opacity-10"></div>
            )}
            
            {imageErrors[cleanedUrl] && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-xs text-gray-500">
                Image non disponible
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ProductImageNavigationThumbnails;
