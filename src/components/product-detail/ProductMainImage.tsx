
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

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [imageUrl]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoading(false);
    setHasError(true);
    console.error("ProductImageDisplay - Error loading image:", imageUrl);
    (e.target as HTMLImageElement).src = "/placeholder.svg";
  };

  return (
    <div className="relative w-full aspect-square sm:aspect-[4/3] md:aspect-[3/2] flex items-center justify-center p-4">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
      )}
      <img 
        src={addTimestamp(imageUrl)} 
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
  );
};

export default ProductMainImage;
