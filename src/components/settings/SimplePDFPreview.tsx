
import React, { useRef, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { SAMPLE_DATA } from "./pdf-preview/SampleData";
import PreviewControls from "./pdf-preview/PreviewControls";
import PDFCanvas from "./pdf-preview/PDFCanvas";
import InstructionsPanel from "./pdf-preview/InstructionsPanel";

interface SimplePDFPreviewProps {
  template: any;
  onSave: (updatedTemplate: any) => void;
}

// Constante pour la conversion mm en pixels (standard: 1 mm = 3.7795275591 px à 96 DPI)
const MM_TO_PX = 3.7795275591;

const SimplePDFPreview: React.FC<SimplePDFPreviewProps> = ({ template, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDraggable, setIsDraggable] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [localTemplate, setLocalTemplate] = useState(template);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalTemplate(template);
    setHasUnsavedChanges(false);
  }, [template]);

  useEffect(() => {
    setPageLoaded(false);
  }, [currentPage]);

  const handleDrag = (clientX: number, clientY: number) => {
    if (!isDragging || !draggedFieldId) return;

    // Obtenir les dimensions précises du conteneur PDF
    const pdfContainer = document.querySelector(".bg-white.shadow-lg.relative");
    if (!pdfContainer) return;

    const pdfRect = pdfContainer.getBoundingClientRect();
    
    // Calculer la position exacte en pixels
    const pixelX = clientX - pdfRect.left - dragOffsetX;
    const pixelY = clientY - pdfRect.top - dragOffsetY;
    
    // Convertir les pixels en millimètres en tenant compte du zoom
    const mmX = pixelX / (MM_TO_PX * zoomLevel);
    const mmY = pixelY / (MM_TO_PX * zoomLevel);

    // Limiter aux dimensions d'une page A4 (210mm x 297mm)
    const boundedX = Math.max(0, Math.min(mmX, 210));
    const boundedY = Math.max(0, Math.min(mmY, 297));

    console.log(`Field position: x=${boundedX.toFixed(2)}mm, y=${boundedY.toFixed(2)}mm`);

    // Mettre à jour le template local avec les nouvelles coordonnées
    const updatedFields = localTemplate.fields.map((field: any) => {
      if (field.id === draggedFieldId && (field.page === currentPage || (currentPage === 0 && field.page === undefined))) {
        return {
          ...field,
          position: {
            x: boundedX,
            y: boundedY
          }
        };
      }
      return field;
    });

    setLocalTemplate({
      ...localTemplate,
      fields: updatedFields
    });
    
    setHasUnsavedChanges(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedFieldId(null);
  };

  const handleSaveChanges = () => {
    if (onSave && hasUnsavedChanges) {
      onSave(localTemplate);
      setHasUnsavedChanges(false);
      toast.success("Positions des champs sauvegardées avec succès");
    }
  };

  const handleStartDrag = (fieldId: string, offsetX: number, offsetY: number) => {
    if (!isDraggable) return;
    console.log(`Starting drag for field ${fieldId}, offsets: ${offsetX}px, ${offsetY}px`);
    setIsDragging(true);
    setDraggedFieldId(fieldId);
    setDragOffsetX(offsetX);
    setDragOffsetY(offsetY);
  };
  
  return (
    <div className="space-y-4" ref={previewRef}>
      <PreviewControls 
        zoomLevel={zoomLevel}
        setZoomLevel={setZoomLevel}
        isDraggable={isDraggable}
        setIsDraggable={setIsDraggable}
        hasUnsavedChanges={hasUnsavedChanges}
        onSave={handleSaveChanges}
        sampleData={SAMPLE_DATA}
        localTemplate={localTemplate}
        setLoading={setLoading}
      />
      
      <Card>
        <CardContent className="p-0 overflow-hidden">
          <PDFCanvas 
            localTemplate={localTemplate}
            zoomLevel={zoomLevel}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            pageLoaded={pageLoaded}
            setPageLoaded={setPageLoaded}
            isDraggable={isDraggable}
            sampleData={SAMPLE_DATA}
            onStartDrag={handleStartDrag}
            onDrag={handleDrag}
            onEndDrag={handleDragEnd}
          />
        </CardContent>
      </Card>
      
      <InstructionsPanel />
    </div>
  );
};

export default SimplePDFPreview;
