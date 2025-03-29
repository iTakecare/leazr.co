
import React from "react";

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
  if (images.length <= 1) {
    return null;
  }
  
  return (
    <div className="flex overflow-x-auto md:overflow-y-auto md:flex-col md:h-[400px] gap-2 mt-4 md:mt-0 md:w-24 md:min-w-24 pb-2 md:pb-0">
      {images.map((url, index) => (
        <button
          key={index}
          className={`relative min-w-16 h-16 border-2 rounded-lg transition-all 
            ${currentIndex === index ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-gray-300'}
            overflow-hidden flex-shrink-0`}
          onClick={() => onThumbnailClick(url, index)}
        >
          <img 
            src={addTimestamp(url)} 
            alt={`Thumbnail ${index + 1}`}
            className="w-full h-full object-cover object-center"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder.svg";
            }}
          />
          {currentIndex === index && (
            <div className="absolute inset-0 bg-indigo-500 bg-opacity-10"></div>
          )}
        </button>
      ))}
    </div>
  );
};

export default ProductImageNavigationThumbnails;
