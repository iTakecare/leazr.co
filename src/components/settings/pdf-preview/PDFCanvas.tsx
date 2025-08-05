
import React, { useRef, useEffect, memo } from "react";
import PageNavigation from "./PageNavigation";
import PageImage from "./PageImage";
import PDFFieldDisplay from "./PDFFieldDisplay";
import SignatureSection from "./SignatureSection";
import PDFFooter from "./PDFFooter";
import DebugInfo from "./DebugInfo";

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
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

// Conversion de mm en pixels à 96 DPI
const MM_TO_PX = 3.7795275591;
const A4_WIDTH_PX = A4_WIDTH_MM * MM_TO_PX;
const A4_HEIGHT_PX = A4_HEIGHT_MM * MM_TO_PX;

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
  useRealData = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const totalPages = localTemplate?.images?.length || 0;

  const canvasWidth = A4_WIDTH_PX * (zoomLevel / 100);
  const canvasHeight = A4_HEIGHT_PX * (zoomLevel / 100);

  // Calcul du facteur d'échelle pour les positions des champs
  const scaleFactor = zoomLevel / 100;

  useEffect(() => {
    // Reset page loaded state when current page changes
    setPageLoaded(false);
  }, [currentPage, setPageLoaded]);

  const handlePageLoad = () => {
    setPageLoaded(true);
  };

  return (
    <div className="flex flex-col items-center h-full">
      <PageNavigation
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
      />

      <div
        ref={containerRef}
        className="relative bg-gray-100 overflow-auto p-8 flex-1 w-full flex justify-center"
        style={{ height: "calc(100vh - 220px)" }}
      >
        <div
          className="relative bg-white shadow-lg"
          style={{
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
          }}
        >
          {/* Page image background */}
          <PageImage
            imageUrl={localTemplate?.images?.[currentPage - 1]}
            onLoad={handlePageLoad}
            width={canvasWidth}
            height={canvasHeight}
            currentPage={currentPage}
            setPageLoaded={setPageLoaded}
          />

          {/* Display PDF fields */}
          {pageLoaded &&
            localTemplate?.fields &&
            localTemplate.fields
              .filter((field: any) => field.page === currentPage)
              .map((field: any) => (
                <PDFFieldDisplay
                  key={field.id}
                  field={field}
                  scaleFactor={scaleFactor}
                  isDraggable={isDraggable}
                  sampleData={sampleData}
                  onStartDrag={(offsetX: number, offsetY: number) =>
                    onStartDrag(field.id, offsetX, offsetY)
                  }
                  onDrag={onDrag}
                  onEndDrag={onEndDrag}
                  useRealData={useRealData}
                />
              ))}

          {/* Signature section */}
          {currentPage === totalPages && (
            <SignatureSection
              pageHeight={canvasHeight}
              scaleFactor={scaleFactor}
            />
          )}
        </div>
      </div>

      <PDFFooter 
        pageNumber={currentPage} 
        totalPages={totalPages}
      />

      {/* Debug information */}
      {process.env.NODE_ENV === "development" && (
        <DebugInfo
          currentPage={currentPage}
          zoomLevel={zoomLevel}
          pageWidth={canvasWidth}
          pageHeight={canvasHeight}
          fields={localTemplate?.fields?.filter((f: any) => f.page === currentPage) || []}
          localTemplate={localTemplate}
        />
      )}
    </div>
  );
};

export default memo(PDFCanvas);
