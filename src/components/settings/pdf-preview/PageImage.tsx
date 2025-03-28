
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
      setPageLoaded(false);
      return;
    }
    
    try {
      // Case 1: Direct URL string
      if (typeof pageImage === 'string') {
        // Already a data URL
        if (pageImage.startsWith('data:')) {
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
      
      // Case 3: Object with data property that might be a direct binary or base64 string
      if (pageImage.data) {
        // If data is already a data URL
        if (typeof pageImage.data === 'string' && pageImage.data.startsWith('data:')) {
          setImageUrl(pageImage.data);
          return;
        }
        
        // Try to handle JSON data
        if (typeof pageImage.data === 'string') {
          // Check if it's a JSON string
          if (pageImage.data.startsWith('{') || pageImage.data.startsWith('[')) {
            try {
              const jsonData = JSON.parse(pageImage.data);
              
              // If parsed JSON has a data property with a string value
              if (jsonData && typeof jsonData.data === 'string') {
                // If it's already a data URL
                if (jsonData.data.startsWith('data:')) {
                  setImageUrl(jsonData.data);
                  return;
                }
                
                // Assume it's base64 and detect content type
                const contentType = detectContentType(jsonData.data);
                setImageUrl(`data:${contentType};base64,${jsonData.data}`);
                return;
              }
              
              // If parsed JSON itself is a base64 string
              if (typeof jsonData === 'string') {
                const contentType = detectContentType(jsonData);
                setImageUrl(`data:${contentType};base64,${jsonData}`);
                return;
              }
            } catch (e) {
              console.error("Error parsing JSON:", e);
              // Continue with treating as base64
            }
          }
          
          // If not valid JSON, treat as base64 string
          if (!pageImage.data.startsWith('data:')) {
            const contentType = detectContentType(pageImage.data);
            setImageUrl(`data:${contentType};base64,${pageImage.data}`);
          } else {
            setImageUrl(pageImage.data);
          }
          return;
        }
      }
      
      // Last resort: try to use the object directly
      console.warn("Unable to determine image format, using object directly:", pageImage);
      setImageUrl(String(pageImage));
      
    } catch (e) {
      console.error("Error processing image data:", e);
      setImageUrl("/placeholder.svg");
    }
  }, [pageImage, setPageLoaded]);
  
  // Helper to detect content type from base64 data
  const detectContentType = (data: string): string => {
    if (!data) return 'image/png';
    
    // Remove possible data URL prefix to check only the base64 content
    const base64Data = data.startsWith('data:') 
      ? data.split(',')[1] 
      : data;
    
    // Common image signatures in base64
    if (base64Data.startsWith('/9j/')) return 'image/jpeg';
    if (base64Data.startsWith('iVBORw0KGgo')) return 'image/png';
    if (base64Data.startsWith('UklGR')) return 'image/webp';
    if (base64Data.startsWith('R0lGODlh')) return 'image/gif';
    if (base64Data.startsWith('PHN2Zz')) return 'image/svg+xml';
    
    // Default to PNG if no match
    return 'image/png';
  };
  
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
