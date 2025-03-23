
import React from "react";

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
  if (pageImage) {
    if (pageImage.url) {
      return (
        <img 
          src={`${pageImage.url}?t=${new Date().getTime()}`}
          alt={`Template page ${currentPage + 1}`}
          className="w-full h-full object-contain"
          onError={(e) => {
            console.error("Erreur de chargement de l'image:", e.currentTarget.src);
            e.currentTarget.src = "/placeholder.svg";
          }}
          onLoad={() => setPageLoaded(true)}
          style={{ display: "block" }}
        />
      );
    } else if (pageImage.data) {
      return (
        <img 
          src={pageImage.data}
          alt={`Template page ${currentPage + 1}`}
          className="w-full h-full object-contain"
          onError={(e) => {
            console.error("Erreur de chargement de l'image:", e.currentTarget.src);
            e.currentTarget.src = "/placeholder.svg";
          }}
          onLoad={() => setPageLoaded(true)}
          style={{ display: "block" }}
        />
      );
    }
  }
  
  return (
    <div className="w-full h-full bg-white flex items-center justify-center border">
      <p className="text-gray-400">Pas d'image pour la page {currentPage + 1}</p>
    </div>
  );
};

export default PageImage;
