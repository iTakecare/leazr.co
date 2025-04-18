
import React, { useState } from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface ProductImageDisplayProps {
  imageUrl: string;
  altText: string;
}

const ProductImageDisplay: React.FC<ProductImageDisplayProps> = ({ 
  imageUrl, 
  altText
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
    console.log(`Erreur de chargement d'image: ${imageUrl}`);
  };

  return (
    <div className="relative w-full max-w-md mx-auto mb-6">
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md relative group">
        <AspectRatio ratio={4/3}>
          <div className="w-full h-full flex items-center justify-center p-4">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              </div>
            )}
            <img 
              src={imageUrl || "/placeholder.svg"} 
              alt={altText}
              className={`max-w-full max-h-full object-contain transition-all duration-300 
                ${isLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
            {hasError && (
              <div className="absolute bottom-2 left-2 bg-red-50 text-red-500 text-xs px-2 py-1 rounded z-20">
                Image non disponible
              </div>
            )}
          </div>
        </AspectRatio>
      </div>
    </div>
  );
};

export default ProductImageDisplay;
