
import React, { useState } from "react";

interface ProductImageDisplayProps {
  imageUrl: string;
  altText: string;
}

const ProductImageDisplay: React.FC<ProductImageDisplayProps> = ({ imageUrl, altText }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoading(false);
    setHasError(true);
    (e.target as HTMLImageElement).src = "/placeholder.svg";
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden transition-all hover:shadow-md">
      <div className="relative w-full h-full min-h-[250px] flex items-center justify-center p-6">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          </div>
        )}
        <img 
          src={imageUrl} 
          alt={altText}
          className={`max-w-full max-h-96 object-contain transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
        {hasError && (
          <div className="absolute bottom-2 left-2 bg-red-50 text-red-500 text-xs px-2 py-1 rounded">
            Image non disponible
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductImageDisplay;
