
import React, { useState, useEffect } from "react";
import { ZoomIn } from "lucide-react";

interface ProductMainImageProps {
  imageUrl: string;
  altText: string;
  addTimestamp: (url: string) => string;
}

const ProductMainImage: React.FC<ProductMainImageProps> = ({
  imageUrl,
  altText,
  addTimestamp
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [finalImageUrl, setFinalImageUrl] = useState("/placeholder.svg");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!imageUrl || imageUrl === "/placeholder.svg") {
      setFinalImageUrl("/placeholder.svg");
      setIsLoading(false);
      setHasError(true);
      return;
    }
    
    // Apply timestamp for cache busting
    const timestampedUrl = addTimestamp(imageUrl);
    setFinalImageUrl(timestampedUrl);
    setIsLoading(true);
    setHasError(false);
    
    // Preload the image
    const img = new Image();
    img.src = timestampedUrl;
    
    const handleLoad = () => {
      setIsLoading(false);
      setHasError(false);
    };
    
    const handleError = () => {
      console.error("ProductMainImage - Error loading image:", imageUrl);
      
      // Try again up to 3 times
      if (retryCount < 3) {
        setRetryCount(count => count + 1);
        const newTimestampedUrl = `${timestampedUrl}&retry=${retryCount + 1}`;
        img.src = newTimestampedUrl; 
        setFinalImageUrl(newTimestampedUrl);
      } else {
        setIsLoading(false);
        setHasError(true);
        setFinalImageUrl("/placeholder.svg");
      }
    };
    
    img.onload = handleLoad;
    img.onerror = handleError;
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl, addTimestamp, retryCount]);

  return (
    <div className="relative w-full aspect-square sm:aspect-[4/3] md:aspect-[3/2] flex items-center justify-center p-4">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
      )}
      
      <img 
        src={finalImageUrl} 
        alt={altText}
        className={`max-w-full max-h-full object-contain transition-all duration-300 
          ${isLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          console.error("Fallback error handler - Image failed to load:", imageUrl);
          setIsLoading(false);
          setHasError(true);
          setFinalImageUrl("/placeholder.svg");
        }}
      />
      
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <img 
            src="/placeholder.svg" 
            alt={altText} 
            className="max-w-[50%] max-h-[50%] opacity-40"
          />
          <div className="mt-4 bg-red-50 text-red-500 text-sm px-4 py-2 rounded">
            Image non disponible
          </div>
        </div>
      )}
      
      {/* Overlay zoom icon */}
      {!hasError && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-black bg-opacity-40 rounded-full p-2">
            <ZoomIn className="h-6 w-6 text-white" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductMainImage;
