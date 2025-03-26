
import React from "react";

interface ProductImageDisplayProps {
  imageUrl: string;
  altText: string;
}

const ProductImageDisplay: React.FC<ProductImageDisplayProps> = ({ imageUrl, altText }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center">
      <img 
        src={imageUrl} 
        alt={altText}
        className="max-w-full max-h-96 object-contain"
        onError={(e) => {
          (e.target as HTMLImageElement).src = "/placeholder.svg";
        }}
      />
    </div>
  );
};

export default ProductImageDisplay;
