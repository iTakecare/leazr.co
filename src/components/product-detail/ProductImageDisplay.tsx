
import React, { useState } from "react";

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
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [selectedImage, setSelectedImage] = useState(imageUrl);
  
  // Use imageUrl as the default, then add any additional images from imageUrls
  const allImages = [imageUrl, ...(imageUrls || [])].filter(
    (url, index, self) => url && self.indexOf(url) === index // Deduplicate
  );

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoading(false);
    setHasError(true);
    (e.target as HTMLImageElement).src = "/placeholder.svg";
  };
  
  const handleThumbnailClick = (url: string) => {
    setSelectedImage(url);
    setIsLoading(true);
    setHasError(false);
  };

  return (
    <div>
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden transition-all hover:shadow-md mb-4">
        <div className="relative w-full aspect-square md:aspect-video flex items-center justify-center p-4">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            </div>
          )}
          <img 
            src={selectedImage} 
            alt={altText}
            className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
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
      
      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {allImages.map((url, index) => (
            <button
              key={index}
              className={`relative min-w-16 h-16 border rounded ${selectedImage === url ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200'}`}
              onClick={() => handleThumbnailClick(url)}
            >
              <img 
                src={url} 
                alt={`${altText} - image ${index + 1}`}
                className="w-full h-full object-cover object-center"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder.svg";
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImageDisplay;
