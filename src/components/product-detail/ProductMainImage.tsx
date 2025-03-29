
import React, { useState } from "react";
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
  
  // Process URL to fix any issues
  const finalImageUrl = imageUrl && imageUrl !== "/placeholder.svg" 
    ? addTimestamp(imageUrl)
    : "/placeholder.svg";

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };
  
  const handleImageError = () => {
    console.log("Image failed to load:", finalImageUrl);
    setIsLoading(false);
    setHasError(true);
  };

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
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading="lazy"
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
          <div className="bg-black/40 rounded-full p-3">
            <ZoomIn className="h-6 w-6 text-white" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductMainImage;
