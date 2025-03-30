
import React, { useState } from "react";
import { Product } from "@/types/catalog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductImageDisplay from "./ProductImageDisplay";

interface ProductImageGalleryProps {
  product: Product;
}

const ProductImageGallery: React.FC<ProductImageGalleryProps> = ({ product }) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  // Use the main image and any additional images if available
  const images = product.image_urls 
    ? [product.image_url, ...product.image_urls] 
    : [product.image_url];
  
  // Filter out undefined/null images and ensure no duplicates
  const uniqueImages = [...new Set(images.filter(Boolean))];
  
  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % uniqueImages.length);
  };

  const handlePreviousImage = () => {
    setActiveImageIndex((prev) => (prev === 0 ? uniqueImages.length - 1 : prev - 1));
  };

  const handleThumbnailClick = (index: number) => {
    setActiveImageIndex(index);
  };

  return (
    <div className="space-y-4">
      <div className="relative rounded-lg overflow-hidden bg-white">
        <ProductImageDisplay 
          imageUrl={uniqueImages[activeImageIndex] || "/placeholder.svg"} 
          altText={product.name} 
        />
        
        {uniqueImages.length > 1 && (
          <>
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full h-8 w-8"
              onClick={handlePreviousImage}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full h-8 w-8"
              onClick={handleNextImage}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>
      
      {uniqueImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {uniqueImages.map((image, index) => (
            <button 
              key={`thumb-${index}`}
              className={`rounded-md overflow-hidden border-2 flex-shrink-0 w-16 h-16 ${
                activeImageIndex === index 
                  ? 'border-blue-500' 
                  : 'border-transparent hover:border-gray-300'
              }`}
              onClick={() => handleThumbnailClick(index)}
            >
              <img 
                src={image || "/placeholder.svg"} 
                alt={`${product.name} thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImageGallery;
