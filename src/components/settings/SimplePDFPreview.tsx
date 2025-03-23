
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

// Dimensions d'une page A4 en mm
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;

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
  const [isSaving, setIsSaving] = useState(false);
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

    try {
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
      const boundedX = Math.max(0, Math.min(mmX, PAGE_WIDTH_MM));
      const boundedY = Math.max(0, Math.min(mmY, PAGE_HEIGHT_MM));

      console.log(`Position du champ en mm: x=${boundedX.toFixed(1)}mm, y=${boundedY.toFixed(1)}mm`);

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
    } catch (error) {
      console.error("Erreur lors du déplacement du champ:", error);
      toast.error("Erreur lors du déplacement du champ");
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedFieldId(null);
  };

  const handleSaveChanges = async () => {
    if (onSave && hasUnsavedChanges) {
      try {
        setIsSaving(true);
        // Créer une copie profonde pour éviter les problèmes de référence
        const templateToSave = JSON.parse(JSON.stringify(localTemplate));
        
        // S'assurer que tous les champs ont des coordonnées valides
        templateToSave.fields = templateToSave.fields.map((field: any) => {
          // Vérifier si la position existe
          if (!field.position) {
            field.position = { x: 10, y: 10 };
          }
          
          // S'assurer que les valeurs sont des nombres
          field.position.x = Number(field.position.x);
          field.position.y = Number(field.position.y);
          
          return field;
        });
        
        console.log("Sauvegarde du template avec champs:", templateToSave.fields.length);
        
        await onSave(templateToSave);
        setHasUnsavedChanges(false);
        toast.success("Positions des champs sauvegardées avec succès");
      } catch (error) {
        console.error("Erreur lors de la sauvegarde:", error);
        toast.error("Erreur lors de la sauvegarde des positions");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleStartDrag = (fieldId: string, offsetX: number, offsetY: number) => {
    if (!isDraggable) return;
    console.log(`Début du déplacement pour le champ ${fieldId}, décalage: ${offsetX}px, ${offsetY}px`);
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
        isSaving={isSaving}
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
