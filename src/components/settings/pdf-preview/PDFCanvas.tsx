
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
    // Log pour déboguer les champs avec positions en mm
    if (localTemplate?.fields?.length > 0) {
      console.log("Champs disponibles avec coordonnées en mm:");
      localTemplate.fields.forEach((f: any) => {
        if (f.position) {
          console.log(`${f.id}: (${f.position.x.toFixed(1)}mm, ${f.position.y.toFixed(1)}mm)`);
        } else {
          console.log(`${f.id}: position non définie`);
        }
      });
    }
  }, [localTemplate?.fields]);

  // Gestion du déplacement des champs
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      onDrag(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      onEndDrag();
    };

    // Ajouter les écouteurs d'événement
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Nettoyer les écouteurs lors du démontage
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onDrag, onEndDrag]);

  const getCurrentPageFields = () => {
    console.log("Page courante:", currentPage);
    
    const fields = localTemplate?.fields?.filter((f: any) => {
      const isForCurrentPage = f.page === currentPage || (currentPage === 0 && f.page === undefined);
      const isVisible = f.isVisible !== false;
      const hasPosition = f.position !== undefined;
      
      if (isForCurrentPage && isVisible) {
        console.log(`Champ ${f.id} pour la page ${currentPage}:`, 
          hasPosition ? `Position (${f.position.x.toFixed(1)}mm, ${f.position.y.toFixed(1)}mm)` : "Position non définie");
      }
      
      return isForCurrentPage && isVisible && hasPosition;
    }) || [];
    
    console.log(`${fields.length} champs trouvés pour la page ${currentPage}`);
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
      onMouseLeave={onEndDrag}
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
