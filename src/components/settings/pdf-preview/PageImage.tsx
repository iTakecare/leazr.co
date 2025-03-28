
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
  // Function to extract proper image source
  const getImageSource = () => {
    if (!pageImage) return null;

    // Direct URL
    if (typeof pageImage === 'string') {
      // Add timestamp to avoid caching issues
      const timestamp = new Date().getTime();
      const separator = pageImage.includes('?') ? '&' : '?';
      return `${pageImage}${separator}t=${timestamp}`;
    }
    
    // Object with URL property
    if (pageImage.url) {
      // Add timestamp to avoid caching issues
      const timestamp = new Date().getTime();
      const separator = pageImage.url.includes('?') ? '&' : '?';
      return `${pageImage.url}${separator}t=${timestamp}`;
    }
    
    // Object with data property (base64 or JSON)
    if (pageImage.data) {
      let imageSrc = pageImage.data;
      
      // Handle JSON-encoded base64 data
      if (typeof pageImage.data === 'string') {
        // If it's already a data URL
        if (pageImage.data.startsWith('data:')) {
          return pageImage.data;
        }
        
        // If it's JSON encoded
        if (pageImage.data.startsWith('{')) {
          try {
            const jsonData = JSON.parse(pageImage.data);
            if (jsonData.data && typeof jsonData.data === 'string') {
              imageSrc = jsonData.data;
            }
          } catch (e) {
            console.error("Failed to parse image JSON data:", e);
          }
        }
        
        // Ensure it's a properly formatted data URL
        if (!imageSrc.startsWith('data:')) {
          // Try to determine content type from base64 prefix
          let contentType = 'image/png'; // default
          
          if (imageSrc.startsWith('/9j/')) {
            contentType = 'image/jpeg';
          } else if (imageSrc.startsWith('iVBORw0KGgo')) {
            contentType = 'image/png';
          } else if (imageSrc.startsWith('UklGR')) {
            contentType = 'image/webp';
          } else if (imageSrc.startsWith('R0lGODlh')) {
            contentType = 'image/gif';
          }
          
          // Add data:image header if not present
          if (!imageSrc.includes('data:')) {
            imageSrc = `data:${contentType};base64,${imageSrc}`;
          }
        }
      }
      
      return imageSrc;
    }
    
    return null;
  };
  
  const imageSource = getImageSource();
  
  if (imageSource) {
    return (
      <img 
        src={imageSource}
        alt={`Template page ${currentPage + 1}`}
        className="w-full h-full object-contain"
        onError={(e) => {
          console.error("Error loading image:", e.currentTarget.src);
          e.currentTarget.src = "/placeholder.svg";
        }}
        onLoad={() => setPageLoaded(true)}
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
