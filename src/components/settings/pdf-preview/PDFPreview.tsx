
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PDFTemplate } from "@/utils/templateManager";

interface PDFPreviewProps {
  template: PDFTemplate;
  pageIndex: number;
}

const PDFPreview: React.FC<PDFPreviewProps> = ({ template, pageIndex }) => {
  // Get current page image
  const currentPageImage = template.templateImages && template.templateImages.length > pageIndex 
    ? template.templateImages[pageIndex] 
    : null;

  // Get fields for current page
  const fieldsForPage = template.fields?.filter(field => field.page === pageIndex && field.isVisible) || [];

  return (
    <div className="relative w-full aspect-[0.7071] border rounded-md overflow-hidden bg-white shadow-sm">
      {currentPageImage ? (
        <>
          <img 
            src={currentPageImage.data} 
            alt={`Page ${pageIndex + 1}`}
            className="absolute top-0 left-0 w-full h-full object-contain"
          />
          
          {/* Render fields on top of the image */}
          {fieldsForPage.map(field => (
            <div 
              key={field.id}
              className="absolute"
              style={{
                left: `${field.position.x}px`,
                top: `${field.position.y}px`,
                fontSize: `${field.style?.fontSize || 12}px`,
                fontWeight: field.style?.fontWeight || 'normal',
                fontStyle: field.style?.fontStyle || 'normal',
                textDecoration: field.style?.textDecoration || 'none',
                color: field.style?.color || '#000000'
              }}
            >
              {field.value}
            </div>
          ))}
        </>
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Aucune image disponible pour cette page</p>
        </div>
      )}
    </div>
  );
};

export default PDFPreview;
