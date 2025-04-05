
import React, { useState, useEffect } from "react";
import { parseImageData } from "@/utils/imageUtils";

interface PageImageProps {
  pageImage: any;
  currentPage: number;
  setPageLoaded: (loaded: boolean) => void;
}

const PageImage: React.FC<PageImageProps> = ({
  pageImage,
  currentPage,
  setPageLoaded
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  // Parse and process the image data on component mount or when pageImage changes
  useEffect(() => {
    if (!pageImage) {
      setImageUrl(null);
      setPageLoaded(false);
      return;
    }
    
    try {
      // Use our enhanced parseImageData function to handle various formats
      const parsedUrl = parseImageData(pageImage);
      setImageUrl(parsedUrl);
    } catch (e) {
      console.error("Error processing image data:", e);
      setImageUrl("/placeholder.svg");
    }
  }, [pageImage, setPageLoaded]);
  
  // Handle image loading
  const handleImageLoad = () => {
    console.log("Image loaded successfully");
    setPageLoaded(true);
  };
  
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error("Error loading image:", e.currentTarget.src.substring(0, 100));
    e.currentTarget.src = "/placeholder.svg";
    setPageLoaded(true); // Still mark as loaded so the UI isn't stuck
  };
  
  if (imageUrl) {
    return (
      <img 
        src={imageUrl}
        alt={`Template page ${currentPage + 1}`}
        className="w-full h-full object-contain"
        onError={handleImageError}
        onLoad={handleImageLoad}
        style={{ display: "block" }}
      />
    );
  }
  
  return (
    <div className="w-full h-full bg-white flex items-center justify-center border">
      <p className="text-gray-400">Pas d'image pour la page {currentPage + 1}</p>
    </div>
  );
};

export default PageImage;
