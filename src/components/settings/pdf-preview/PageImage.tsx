
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
  // For debugging
  if (pageImage) {
    console.log(`PageImage rendering for page ${currentPage + 1}:`, 
      typeof pageImage === 'object' ? 
      `Object with properties: ${Object.keys(pageImage).join(', ')}` : 
      `Type: ${typeof pageImage}`
    );
  }

  if (pageImage) {
    if (pageImage.url) {
      // Handle URL-based images (from storage)
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
      // Handle data URL or base64 encoded images
      let imageSrc = pageImage.data;
      
      // Check if it's a JSON string containing base64 data and extract it
      if (typeof pageImage.data === 'string' && pageImage.data.startsWith('{')) {
        try {
          const jsonData = JSON.parse(pageImage.data);
          if (jsonData.data && typeof jsonData.data === 'string') {
            imageSrc = jsonData.data;
          }
        } catch (e) {
          console.error("Failed to parse image JSON data:", e);
        }
      }
      
      // Ensure the data is a proper data URL
      if (typeof imageSrc === 'string' && !imageSrc.startsWith('data:')) {
        // Try to determine the content type (assume image/png if unknown)
        const contentType = imageSrc.startsWith('/9j/') ? 'image/jpeg' : 'image/png';
        imageSrc = `data:${contentType};base64,${imageSrc}`;
      }
      
      return (
        <img 
          src={imageSrc}
          alt={`Template page ${currentPage + 1}`}
          className="w-full h-full object-contain"
          onError={(e) => {
            console.error("Erreur de chargement de l'image data:", e.currentTarget.src);
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
