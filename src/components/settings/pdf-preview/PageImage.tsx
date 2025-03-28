
import React, { useState, useEffect } from "react";

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
      return;
    }
    
    try {
      // Case 1: Direct URL string
      if (typeof pageImage === 'string') {
        if (pageImage.startsWith('data:')) {
          // Already a data URL
          setImageUrl(pageImage);
        } else {
          // Add cache buster to URL
          const timestamp = new Date().getTime();
          const separator = pageImage.includes('?') ? '&' : '?';
          setImageUrl(`${pageImage}${separator}t=${timestamp}`);
        }
        return;
      }
      
      // Case 2: Object with URL property
      if (pageImage.url) {
        const timestamp = new Date().getTime();
        const separator = pageImage.url.includes('?') ? '&' : '?';
        setImageUrl(`${pageImage.url}${separator}t=${timestamp}`);
        return;
      }
      
      // Case 3: Object with data property
      if (pageImage.data) {
        // If data is already a data URL
        if (typeof pageImage.data === 'string' && pageImage.data.startsWith('data:')) {
          setImageUrl(pageImage.data);
          return;
        }
        
        // If data is JSON string, try to parse it
        if (typeof pageImage.data === 'string' && (
          pageImage.data.startsWith('{') || 
          pageImage.data.startsWith('[') ||
          pageImage.data.includes('"data":')
        )) {
          try {
            // Parse the JSON to extract image data
            let parsedData = JSON.parse(pageImage.data);
            
            // Handle different JSON structures
            let imageData = parsedData;
            if (parsedData.data) {
              imageData = parsedData.data;
            }
            
            // Convert to data URL if needed
            if (typeof imageData === 'string' && !imageData.startsWith('data:')) {
              // Detect content type from base64 prefix
              let contentType = 'image/png'; // default
              
              if (imageData.startsWith('/9j/')) {
                contentType = 'image/jpeg';
              } else if (imageData.startsWith('iVBORw0KGgo')) {
                contentType = 'image/png';
              } else if (imageData.startsWith('UklGR')) {
                contentType = 'image/webp';
              } else if (imageData.startsWith('R0lGODlh')) {
                contentType = 'image/gif';
              } else if (imageData.startsWith('PHN2Zz')) {
                contentType = 'image/svg+xml';
              }
              
              setImageUrl(`data:${contentType};base64,${imageData}`);
            } else {
              // Use the parsed data directly
              setImageUrl(imageData);
            }
          } catch (e) {
            console.error("Failed to parse JSON data:", e, pageImage.data.substring(0, 100));
            setImageUrl("/placeholder.svg");
          }
          return;
        }
        
        // Direct base64 string without JSON wrapper
        if (typeof pageImage.data === 'string') {
          // Detect content type
          let contentType = 'image/png'; // default
          
          if (pageImage.data.startsWith('/9j/')) {
            contentType = 'image/jpeg';
          } else if (pageImage.data.startsWith('iVBORw0KGgo')) {
            contentType = 'image/png';
          } else if (pageImage.data.startsWith('UklGR')) {
            contentType = 'image/webp';
          } else if (pageImage.data.startsWith('R0lGODlh')) {
            contentType = 'image/gif';
          } else if (pageImage.data.startsWith('PHN2Zz')) {
            contentType = 'image/svg+xml';
          }
          
          // Check if it already has a data prefix
          if (!pageImage.data.startsWith('data:')) {
            setImageUrl(`data:${contentType};base64,${pageImage.data}`);
          } else {
            setImageUrl(pageImage.data);
          }
          return;
        }
      }
      
      // Fallback
      console.warn("Unable to determine image format", pageImage);
      setImageUrl("/placeholder.svg");
      
    } catch (e) {
      console.error("Error processing image data:", e);
      setImageUrl("/placeholder.svg");
    }
  }, [pageImage]);
  
  // Handle image loading
  const handleImageLoad = () => {
    console.log("Image loaded successfully:", imageUrl?.substring(0, 50));
    setPageLoaded(true);
  };
  
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error("Error loading image:", e.currentTarget.src.substring(0, 100));
    e.currentTarget.src = "/placeholder.svg";
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
