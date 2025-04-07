
import React from "react";

interface PageImageProps {
  imageUrl?: string | null;
  pageImage?: any; // Adding the pageImage prop
  onLoad: () => void;
  width?: number;
  height?: number;
  currentPage?: number; // Adding currentPage prop for PageImage
  setPageLoaded?: (loaded: boolean) => void; // Adding setPageLoaded prop
}

const PageImage: React.FC<PageImageProps> = ({ 
  imageUrl, 
  pageImage, 
  onLoad, 
  width = 595, 
  height = 842,
  currentPage,
  setPageLoaded
}) => {
  // Use either the direct imageUrl or extract from pageImage
  const displayUrl = imageUrl || (pageImage && pageImage.url) || null;

  // Handle the onLoad callback using either the direct onLoad or setPageLoaded
  const handleImageLoad = () => {
    if (onLoad) onLoad();
    if (setPageLoaded) setPageLoaded(true);
  };

  if (!displayUrl) {
    return (
      <div 
        className="w-full h-full bg-white flex items-center justify-center border"
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        <p className="text-gray-400">No image available</p>
      </div>
    );
  }

  return (
    <img
      src={displayUrl}
      alt="PDF Template Page"
      className="w-full h-full object-contain"
      style={{ width: `${width}px`, height: `${height}px` }}
      onError={(e) => {
        console.error("Image loading error:", e);
        e.currentTarget.src = "/placeholder.svg";
      }}
      onLoad={handleImageLoad}
    />
  );
};

export default PageImage;
