
import React from "react";
import PDFField from "./PDFField";
import PageFooter from "./PageFooter";

interface PDFPageProps {
  currentPage: number;
  template: any;
  backgroundImage: string | null;
  pageLoaded: boolean;
  fields: any[];
  zoomLevel: number;
  sampleData: any;
  onImageLoad: () => void;
  onImageError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

const PDFPage: React.FC<PDFPageProps> = ({ 
  currentPage,
  template,
  backgroundImage,
  pageLoaded,
  fields,
  zoomLevel,
  sampleData,
  onImageLoad,
  onImageError
}) => {
  // If we have a background image for this page
  if (backgroundImage) {
    return (
      <div className="relative" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <div className="flex-grow relative">
          <img 
            src={backgroundImage} 
            alt={`Template page ${currentPage + 1}`}
            className="w-full h-full object-contain"
            onError={onImageError}
            onLoad={onImageLoad}
            style={{ display: "block" }}
          />
          
          {pageLoaded && fields.map((field) => (
            <PDFField 
              key={field.id} 
              field={field} 
              zoomLevel={zoomLevel}
              sampleData={sampleData}
              currentPage={currentPage}
            />
          ))}
        </div>
        
        <PageFooter 
          zoomLevel={zoomLevel}
          template={template}
        />
      </div>
    );
  }
  
  // Fallback for when there's no image
  return (
    <div className="w-full h-full bg-white flex items-center justify-center border">
      <p className="text-gray-400">Pas d'image pour la page {currentPage + 1}</p>
    </div>
  );
};

export default PDFPage;
