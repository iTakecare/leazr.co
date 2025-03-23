
import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PDFTemplatePreviewProps {
  template: any;
}

const PDFTemplatePreview = ({ template }: PDFTemplatePreviewProps) => {
  return (
    <ScrollArea className="h-full w-full">
      <div className="flex flex-col items-center">
        {template.templateImages && template.templateImages.length > 0 ? (
          template.templateImages.map((imageData: any, pageIndex: number) => (
            <div
              key={imageData.id || pageIndex}
              className="relative mb-8 bg-white"
              style={{
                width: '595px', // A4 width at 72dpi
                minHeight: '842px', // A4 height at 72dpi
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                backgroundImage: `url(${imageData.imageUrl})`,
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              {/* Afficher les champs positionnés sur cette page */}
              {imageData.fields && Object.values(imageData.fields).map((field: any) => (
                <div
                  key={field.id}
                  style={{
                    position: 'absolute',
                    left: `${field.x}px`,
                    top: `${field.y}px`,
                    width: `${field.width}px`,
                    height: `${field.height}px`,
                    padding: '4px',
                    fontSize: `${field.fontSize}px`,
                    fontFamily: field.fontFamily || 'Arial',
                    color: field.color || '#000000',
                    fontWeight: field.bold ? 'bold' : 'normal',
                    fontStyle: field.italic ? 'italic' : 'normal',
                    textAlign: field.alignment || 'left',
                    overflow: 'hidden'
                  }}
                >
                  {field.fieldType === 'static' ? field.value : `<${field.fieldType}>`}
                </div>
              ))}
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p>Aucune page définie dans ce modèle</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};

export default PDFTemplatePreview;
