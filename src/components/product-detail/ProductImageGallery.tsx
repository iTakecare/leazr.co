
import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ProductImageGalleryProps {
  images: string[];
  productName: string;
  className?: string;
}

const ProductImageGallery: React.FC<ProductImageGalleryProps> = ({
  images,
  productName,
  className
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Fallback to placeholder if no images
  const displayImages = images.length > 0 ? images : ["/placeholder.svg"];
  const currentImage = displayImages[currentImageIndex];
  const hasMultipleImages = displayImages.length > 1;

  const goToPrevious = () => {
    setCurrentImageIndex(prev => 
      prev === 0 ? displayImages.length - 1 : prev - 1
    );
    setImageLoading(true);
  };

  const goToNext = () => {
    setCurrentImageIndex(prev => 
      prev === displayImages.length - 1 ? 0 : prev + 1
    );
    setImageLoading(true);
  };

  const selectImage = (index: number) => {
    setCurrentImageIndex(index);
    setImageLoading(true);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Image */}
      <div className="relative group">
        <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden border">
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            </div>
          )}
          
          <img
            src={currentImage}
            alt={`${productName} - Image ${currentImageIndex + 1}`}
            className="w-full h-full object-contain p-4 transition-opacity duration-300"
            style={{ opacity: imageLoading ? 0 : 1 }}
            onLoad={handleImageLoad}
            onError={() => setImageLoading(false)}
          />

          {/* Navigation arrows - only show if multiple images */}
          {hasMultipleImages && !imageLoading && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white"
                onClick={goToPrevious}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white"
                onClick={goToNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* Zoom button */}
          {!imageLoading && currentImage !== "/placeholder.svg" && (
            <Button
              variant="outline"
              size="icon"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white"
              onClick={() => setIsZoomed(true)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}

          {/* Image counter */}
          {hasMultipleImages && (
            <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              {currentImageIndex + 1} / {displayImages.length}
            </div>
          )}
        </div>
      </div>

      {/* Thumbnails - only show if multiple images */}
      {hasMultipleImages && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {displayImages.map((image, index) => (
            <button
              key={index}
              onClick={() => selectImage(index)}
              className={cn(
                "flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                index === currentImageIndex
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <img
                src={image}
                alt={`${productName} - Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Zoom Modal */}
      <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0">
          <div className="relative">
            <img
              src={currentImage}
              alt={`${productName} - Zoom`}
              className="w-full h-full object-contain"
            />
            
            {hasMultipleImages && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white"
                  onClick={goToPrevious}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white"
                  onClick={goToNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductImageGallery;
