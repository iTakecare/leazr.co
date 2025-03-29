
import React, { useState, useEffect } from "react";
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
  // Filter valid images and deduplicate them
  const filterValidImages = (urls: string[]): string[] => {
    // Create a set to deduplicate images
    const uniqueUrlsSet = new Set<string>();
    
    // Add main image if valid
    if (isValidImageUrl(imageUrl)) {
      uniqueUrlsSet.add(imageUrl);
    }
    
    // Add additional images if valid
    if (Array.isArray(urls)) {
      urls.forEach(url => {
        if (isValidImageUrl(url)) {
          uniqueUrlsSet.add(url);
        }
      });
    }
    
    // Convert set back to array
    return Array.from(uniqueUrlsSet);
  };
  
  // Helper function to check if an image URL is valid
  const isValidImageUrl = (url: string | null | undefined): boolean => {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return false;
    }
    
    if (url === '/placeholder.svg') {
      return false;
    }
    
    // Exclude placeholder or hidden files
    if (
      url.includes('.emptyFolderPlaceholder') || 
      url.split('/').pop()?.startsWith('.') ||
      url.includes('undefined') ||
      url.endsWith('/')
    ) {
      return false;
    }
    
    // Try to validate as URL
    try {
      new URL(url);
      return true;
    } catch (e) {
      console.error(`Invalid URL: ${url}`);
      return false;
    }
  };

  // Use imageUrl as the default, then add any additional valid images from imageUrls
  const allImages = filterValidImages([imageUrl, ...(imageUrls || [])]);

  const [selectedImage, setSelectedImage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  console.log("ProductImageDisplay - Available images:", allImages);
  
  // Set the first image as the selected image on component mount or when images change
  useEffect(() => {
    if (allImages.length > 0) {
      setSelectedImage(allImages[0]);
      setCurrentIndex(0);
      setIsLoading(true);
      console.log("ProductImageDisplay - Setting initial image:", allImages[0]);
    } else {
      setSelectedImage('/placeholder.svg');
      setIsLoading(false);
      setHasError(true);
    }
  }, [allImages, imageUrl, imageUrls]);
  
  // Pre-load the first image
  useEffect(() => {
    if (allImages.length > 0) {
      const img = new Image();
      img.src = addTimestamp(allImages[0]);
      img.onload = () => {
        setIsLoading(false);
        setHasError(false);
        console.log("ProductImageDisplay - Image loaded successfully:", allImages[0]);
      };
      img.onerror = () => {
        setIsLoading(false);
        setHasError(true);
        console.error("ProductImageDisplay - Failed to load image:", allImages[0]);
      };
    }
  }, [allImages]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
    console.log("ProductImageDisplay - Image loaded:", selectedImage);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoading(false);
    setHasError(true);
    console.error("ProductImageDisplay - Error loading image:", selectedImage);
    (e.target as HTMLImageElement).src = "/placeholder.svg";
  };
  
  const handleThumbnailClick = (url: string, index: number) => {
    console.log("ProductImageDisplay - Thumbnail clicked:", url);
    setSelectedImage(url);
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
    
    console.log(`ProductImageDisplay - Navigating ${direction} to image at index ${newIndex}:`, allImages[newIndex]);
    setCurrentIndex(newIndex);
    setSelectedImage(allImages[newIndex]);
    setIsLoading(true);
    setHasError(false);
  };

  // Add a timestamp to image URLs to prevent caching issues
  const addTimestamp = (url: string): string => {
    if (!url || url === '/placeholder.svg') return "/placeholder.svg";
    
    try {
      // Add a timestamp query parameter to prevent caching
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}t=${new Date().getTime()}`;
    } catch (e) {
      return "/placeholder.svg";
    }
  };

  // If no valid images, show a placeholder
  if (allImages.length === 0) {
    return (
      <div className="flex flex-col-reverse md:flex-row md:gap-4">
        <div className="flex-1 relative">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md relative group">
            <div className="relative w-full aspect-square flex items-center justify-center p-4">
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
      {/* Side thumbnails (vertical on medium screens and up) */}
      {allImages.length > 1 && (
        <div className="flex overflow-x-auto md:overflow-y-auto md:flex-col md:h-[400px] gap-2 mt-4 md:mt-0 md:w-24 md:min-w-24 pb-2 md:pb-0">
          {allImages.map((url, index) => (
            <button
              key={index}
              className={`relative aspect-square w-16 h-16 border-2 rounded-lg transition-all 
                ${selectedImage === url ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-gray-300'}
                overflow-hidden flex-shrink-0`}
              onClick={() => handleThumbnailClick(url, index)}
            >
              <div className="w-full h-full flex items-center justify-center bg-gray-50">
                <img 
                  src={addTimestamp(url)} 
                  alt={`${altText} - image ${index + 1}`}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                  }}
                />
              </div>
            </button>
          ))}
        </div>
      )}
      
      {/* Main image container */}
      <div className="flex-1 relative">
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md relative group">
          <div className="relative w-full aspect-square flex items-center justify-center p-4">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              </div>
            )}
            <img 
              src={addTimestamp(selectedImage)} 
              alt={altText}
              className={`max-w-full max-h-full object-contain transition-all duration-300 
                ${isLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
            {hasError && (
              <div className="absolute bottom-2 left-2 bg-red-50 text-red-500 text-xs px-2 py-1 rounded">
                Image non disponible
              </div>
            )}
            
            {/* Overlay zoom icon */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-black bg-opacity-40 rounded-full p-2">
                <ZoomIn className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
          
          {/* Navigation arrows for multiple images */}
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
        
        {/* Image counter */}
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
