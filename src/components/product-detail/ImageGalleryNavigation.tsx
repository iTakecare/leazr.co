
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
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full shadow p-3 opacity-70 hover:opacity-100 transition-opacity z-10"
        aria-label="Image précédente"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <button 
        onClick={() => onNavigate('next')}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full shadow p-3 opacity-70 hover:opacity-100 transition-opacity z-10"
        aria-label="Image suivante"
      >
        <ArrowRight className="h-5 w-5" />
      </button>
      
      {/* Image counter */}
      <div className="absolute bottom-4 right-4 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full">
        {currentIndex + 1} / {imagesCount}
      </div>
    </>
  );
};

export default ImageGalleryNavigation;
