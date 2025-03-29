
import React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface ImageGalleryNavigationProps {
  imagesCount: number;
  currentIndex: number;
  onNavigate: (direction: 'prev' | 'next') => void;
}

const ImageGalleryNavigation: React.FC<ImageGalleryNavigationProps> = ({
  imagesCount,
  currentIndex,
  onNavigate
}) => {
  if (imagesCount <= 1) {
    return null;
  }

  return (
    <>
      <button 
        onClick={() => onNavigate('prev')}
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white rounded-full shadow p-2 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Image précédente"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <button 
        onClick={() => onNavigate('next')}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white rounded-full shadow p-2 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Image suivante"
      >
        <ArrowRight className="h-4 w-4" />
      </button>
      
      {/* Image counter */}
      <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full">
        {currentIndex + 1} / {imagesCount}
      </div>
    </>
  );
};

export default ImageGalleryNavigation;
