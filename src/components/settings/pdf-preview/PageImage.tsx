
import React from "react";

interface PageImageProps {
  imageUrl?: string | null;
  pageImage?: any; // Typed as any to support various page image objects
  onLoad: () => void;
  width?: number;
  height?: number;
  currentPage?: number;
  setPageLoaded?: (loaded: boolean) => void;
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
  // Déterminer l'URL à utiliser depuis les différentes sources possibles
  const getDisplayUrl = () => {
    if (imageUrl) return imageUrl;
    
    if (pageImage) {
      if (pageImage.url) return pageImage.url;
      if (pageImage.data) return pageImage.data;
    }
    
    return null;
  };
  
  const displayUrl = getDisplayUrl();
  
  // Gérer le callback onLoad
  const handleImageLoad = () => {
    if (onLoad) onLoad();
    if (setPageLoaded) setPageLoaded(true);
    console.log(`Image chargée pour la page ${currentPage || 1}`);
  };
  
  // Gérer les erreurs de chargement d'image
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error("Erreur de chargement d'image:", e);
    e.currentTarget.src = "/placeholder.svg";
  };

  if (!displayUrl) {
    return (
      <div 
        className="w-full h-full bg-white flex items-center justify-center border"
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        <p className="text-gray-400">Pas d'image disponible</p>
      </div>
    );
  }

  return (
    <img
      src={displayUrl}
      alt={`PDF Template Page ${currentPage || 1}`}
      className="w-full h-full object-contain"
      style={{ width: `${width}px`, height: `${height}px` }}
      onError={handleImageError}
      onLoad={handleImageLoad}
    />
  );
};

export default PageImage;
