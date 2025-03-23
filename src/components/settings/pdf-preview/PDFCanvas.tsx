
import React, { useRef, useEffect } from "react";
import PageNavigation from "./PageNavigation";
import PageImage from "./PageImage";
import PDFFieldDisplay from "../PDFFieldDisplay";

interface PDFCanvasProps {
  localTemplate: any;
  zoomLevel: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageLoaded: boolean;
  setPageLoaded: (loaded: boolean) => void;
  isDraggable: boolean;
  sampleData: any;
  onStartDrag: (fieldId: string, offsetX: number, offsetY: number) => void;
  onDrag: (clientX: number, clientY: number) => void;
  onEndDrag: () => void;
}

const PDFCanvas: React.FC<PDFCanvasProps> = ({
  localTemplate,
  zoomLevel,
  currentPage,
  setCurrentPage,
  pageLoaded,
  setPageLoaded,
  isDraggable,
  sampleData,
  onStartDrag,
  onDrag,
  onEndDrag
}) => {
  const pdfDocumentRef = useRef<HTMLDivElement>(null);
  const hasTemplateImages = localTemplate?.templateImages && 
                           Array.isArray(localTemplate.templateImages) && 
                           localTemplate.templateImages.length > 0;

  useEffect(() => {
    // Log pour déboguer
    if (localTemplate?.fields?.length > 0) {
      console.log("Champs disponibles:", localTemplate.fields.map((f: any) => 
        `${f.id}: (${f.position.x.toFixed(2)}, ${f.position.y.toFixed(2)})`).join(", "));
    }
  }, [localTemplate?.fields]);

  const getCurrentPageFields = () => {
    console.log("Template fields:", localTemplate?.fields);
    console.log("Current page:", currentPage);
    
    const fields = localTemplate?.fields?.filter((f: any) => {
      const isForCurrentPage = f.page === currentPage || (currentPage === 0 && f.page === undefined);
      const isVisible = f.isVisible !== false;
      console.log(`Field ${f.id}: page=${f.page}, isVisible=${f.isVisible}, willShow=${isForCurrentPage && isVisible}`);
      return isForCurrentPage && isVisible;
    }) || [];
    
    console.log("Fields for current page:", fields);
    return fields;
  };

  const getCurrentPageImage = () => {
    if (Array.isArray(localTemplate?.templateImages) && localTemplate.templateImages.length > 0) {
      return localTemplate.templateImages.find(
        (img: any) => img.page === currentPage
      );
    }
    return null;
  };

  return (
    <div 
      className="bg-gray-100 p-4 flex justify-center min-h-[800px] overflow-auto"
    >
      <div 
        ref={pdfDocumentRef}
        className="bg-white shadow-lg relative" 
        style={{ 
          width: `${210 * zoomLevel}mm`, 
          height: `${297 * zoomLevel}mm`,
          maxWidth: "100%"
        }}
      >
        {hasTemplateImages && (
          <PageNavigation 
            currentPage={currentPage}
            totalPages={localTemplate.templateImages.length}
            setCurrentPage={setCurrentPage}
          />
        )}
        
        <div className="relative" style={{ height: "100%" }}>
          <PageImage 
            pageImage={getCurrentPageImage()} 
            currentPage={currentPage}
            setPageLoaded={setPageLoaded}
          />
          
          {pageLoaded && getCurrentPageFields().map((field: any) => (
            <PDFFieldDisplay 
              key={field.id}
              field={field}
              zoomLevel={zoomLevel}
              currentPage={currentPage}
              sampleData={sampleData}
              isDraggable={isDraggable}
              onStartDrag={onStartDrag}
              onDrag={onDrag}
              onEndDrag={onEndDrag}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PDFCanvas;
