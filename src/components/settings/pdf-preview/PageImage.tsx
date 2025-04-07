
import React from "react";

interface PageImageProps {
  imageUrl: string | null;
  onLoad: () => void;
  width: number;
  height: number;
}

const PageImage: React.FC<PageImageProps> = ({ imageUrl, onLoad, width, height }) => {
  if (!imageUrl) {
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
      src={imageUrl}
      alt="PDF Template Page"
      className="w-full h-full object-contain"
      style={{ width: `${width}px`, height: `${height}px` }}
      onError={(e) => {
        console.error("Image loading error:", e);
        e.currentTarget.src = "/placeholder.svg";
      }}
      onLoad={onLoad}
    />
  );
};

export default PageImage;
