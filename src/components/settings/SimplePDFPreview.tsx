
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

  // Constante pour la conversion mm en pixels (standard: 1 mm = 3.7795275591 px à 96 DPI)
  const MM_TO_PX = 3.7795275591;

  useEffect(() => {
    setLocalTemplate(template);
    setHasUnsavedChanges(false);
  }, [template]);

  useEffect(() => {
    setPageLoaded(false);
  }, [currentPage]);

  const handleDrag = (clientX: number, clientY: number) => {
    if (!isDragging || !draggedFieldId) return;

    const pdfDocumentRect = document.querySelector(".bg-white.shadow-lg.relative")?.getBoundingClientRect();
    if (!pdfDocumentRect) return;
    
    const x = (clientX - pdfDocumentRect.left - dragOffsetX) / (MM_TO_PX * zoomLevel);
    const y = (clientY - pdfDocumentRect.top - dragOffsetY) / (MM_TO_PX * zoomLevel);

    const boundedX = Math.max(0, Math.min(x, 210));
    const boundedY = Math.max(0, Math.min(y, 297));

    console.log(`Moving field ${draggedFieldId} to x=${boundedX}mm, y=${boundedY}mm`);

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
