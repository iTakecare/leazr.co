
import React, { useRef, useEffect, memo } from "react";
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
  useRealData?: boolean;
}

// Constantes pour les dimensions de page A4 en mm
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;

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
  onEndDrag,
  useRealData = false
}) => {
  const pdfDocumentRef = useRef<HTMLDivElement>(null);
  const hasTemplateImages = localTemplate?.templateImages && 
                           Array.isArray(localTemplate.templateImages) && 
                           localTemplate.templateImages.length > 0;

  useEffect(() => {
    if (localTemplate?.fields?.length > 0) {
      // Compter les champs avec des positions valides pour cette page
      const validFieldsCount = localTemplate.fields.filter((f: any) => {
        const isForCurrentPage = f.page === currentPage || (currentPage === 0 && f.page === undefined);
        const hasPosition = f.position && typeof f.position.x === 'number' && typeof f.position.y === 'number';
        return isForCurrentPage && hasPosition;
      }).length;
      
      console.log(`Page ${currentPage + 1}: ${validFieldsCount} champs avec positions valides sur ${localTemplate.fields.length} total`);
    }
  }, [localTemplate?.fields, currentPage]);

  // Gestion du déplacement des champs
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      onDrag(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      onEndDrag();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onDrag, onEndDrag]);

  const getCurrentPageFields = () => {
    if (!localTemplate?.fields || !Array.isArray(localTemplate.fields)) {
      return [];
    }
    
    const fields = localTemplate.fields.filter((f: any) => {
      if (!f) return false;
      
      const isForCurrentPage = f.page === currentPage || (currentPage === 0 && f.page === undefined);
      const isVisible = f.isVisible !== false;
      const hasValidPosition = f.position && 
                             typeof f.position.x === 'number' && !isNaN(f.position.x) &&
                             typeof f.position.y === 'number' && !isNaN(f.position.y) &&
                             f.position.x >= 0 && f.position.x <= PAGE_WIDTH_MM &&
                             f.position.y >= 0 && f.position.y <= PAGE_HEIGHT_MM;
      
      return isForCurrentPage && isVisible && hasValidPosition;
    });
    
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

  const fields = getCurrentPageFields();

  // Ajouter des informations sur l'utilisation de données réelles vs exemples
  const dataSourceText = useRealData ? 
    "Utilisation de données réelles" : 
    "Utilisation de données d'exemple";

  return (
    <div 
      className="bg-gray-100 p-4 flex flex-col justify-center min-h-[800px] overflow-auto"
      onMouseLeave={onEndDrag}
    >
      {useRealData && (
        <div className="text-xs text-blue-600 font-medium mb-2 px-2 py-1 bg-blue-50 rounded-md inline-self-start max-w-max">
          {dataSourceText}
        </div>
      )}
      
      <div 
        ref={pdfDocumentRef}
        className="bg-white shadow-lg relative mx-auto" 
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
          
          {pageLoaded && fields.map((field: any) => (
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
              useRealData={useRealData}
            />
          ))}
          
          {pageLoaded && fields.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
              {isDraggable ? 
                "Aucun champ sur cette page. Ajoutez des champs dans l'onglet 'Champs du document'." : 
                "Aucun champ sur cette page. Activez le mode 'Positionner les champs' pour les placer."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(PDFCanvas);
