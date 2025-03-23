
import React, { useRef, useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { SAMPLE_DATA } from "./pdf-preview/SampleData";
import PreviewControls from "./pdf-preview/PreviewControls";
import PDFCanvas from "./pdf-preview/PDFCanvas";
import InstructionsPanel from "./pdf-preview/InstructionsPanel";

interface SimplePDFPreviewProps {
  template: any;
  onSave: (updatedTemplate: any) => Promise<void>;
}

// Constante pour la conversion mm en pixels (standard: 1 mm = 3.7795275591 px à 96 DPI)
const MM_TO_PX = 3.7795275591;

// Dimensions d'une page A4 en mm
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;

// Fonction utilitaire pour vérifier si un champ a des coordonnées valides
const hasValidPosition = (field: any): boolean => {
  return field.position && 
         typeof field.position.x === 'number' && !isNaN(field.position.x) &&
         typeof field.position.y === 'number' && !isNaN(field.position.y) &&
         field.position.x >= 0 && field.position.x <= PAGE_WIDTH_MM &&
         field.position.y >= 0 && field.position.y <= PAGE_HEIGHT_MM;
};

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
  const [saveAttempts, setSaveAttempts] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);

  // Réinitialiser les données locales lorsque le template parent change
  useEffect(() => {
    // Vérifier que le template est valide
    if (template && typeof template === 'object') {
      const safeTemplate = {
        ...template,
        templateImages: Array.isArray(template.templateImages) ? template.templateImages : [],
        fields: Array.isArray(template.fields) ? template.fields : []
      };
      
      setLocalTemplate(safeTemplate);
      setHasUnsavedChanges(false);
    }
  }, [template]);

  // Réinitialiser l'état de chargement de la page lors du changement de page
  useEffect(() => {
    setPageLoaded(false);
  }, [currentPage]);

  // Fonction pour normaliser les champs avant la sauvegarde
  const normalizeFields = useCallback((fields: any[]) => {
    if (!Array.isArray(fields)) return [];
    
    return fields.map(field => {
      // S'assurer que chaque champ a une position valide
      if (!hasValidPosition(field)) {
        return {
          ...field,
          position: { x: 10, y: 10 } // Position par défaut
        };
      }
      
      // Arrondir les valeurs à 1 décimale
      return {
        ...field,
        position: {
          x: Math.round(field.position.x * 10) / 10,
          y: Math.round(field.position.y * 10) / 10
        }
      };
    });
  }, []);

  const handleDrag = useCallback((clientX: number, clientY: number) => {
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

      // Limiter aux dimensions d'une page A4
      const boundedX = Math.max(0, Math.min(mmX, PAGE_WIDTH_MM));
      const boundedY = Math.max(0, Math.min(mmY, PAGE_HEIGHT_MM));
      
      // Arrondir à 1 décimale pour plus de précision sans surcharge
      const roundedX = Math.round(boundedX * 10) / 10;
      const roundedY = Math.round(boundedY * 10) / 10;

      // Mettre à jour le template local avec les nouvelles coordonnées
      setLocalTemplate(prevTemplate => {
        const updatedFields = prevTemplate.fields.map((field: any) => {
          if (field.id === draggedFieldId && (field.page === currentPage || (currentPage === 0 && field.page === undefined))) {
            return {
              ...field,
              position: {
                x: roundedX,
                y: roundedY
              }
            };
          }
          return field;
        });

        return {
          ...prevTemplate,
          fields: updatedFields
        };
      });
      
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error("Erreur lors du déplacement du champ:", error);
    }
  }, [isDragging, draggedFieldId, currentPage, zoomLevel, dragOffsetX, dragOffsetY]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDraggedFieldId(null);
  }, []);

  const handleSaveChanges = async () => {
    if (!hasUnsavedChanges || isSaving) return;
    
    try {
      setIsSaving(true);
      
      // Incrémenter le compteur de tentatives
      setSaveAttempts(prev => prev + 1);
      
      // Créer une copie profonde pour éviter les problèmes de référence
      // Utilisation de JSON.parse/stringify pour une copie profonde sûre
      const clonedTemplate = JSON.parse(JSON.stringify(localTemplate));
      
      // Normalisation des champs pour s'assurer que tous ont des coordonnées valides
      clonedTemplate.fields = normalizeFields(clonedTemplate.fields);
      
      // Log avant sauvegarde
      console.log("Tentative de sauvegarde du template:", 
        `ID: ${clonedTemplate.id}`, 
        `Nombre de champs: ${clonedTemplate.fields.length}`, 
        `Tentative #${saveAttempts + 1}`);
      
      // Vérifier si le template est valide
      if (!clonedTemplate.id || !Array.isArray(clonedTemplate.fields)) {
        throw new Error("Données de template invalides");
      }

      // Appliquer la limite de taille pour éviter les timeouts
      if (JSON.stringify(clonedTemplate).length > 1000000) { // 1MB limite
        toast.error("Le template est trop volumineux. Essayez de réduire le nombre d'images ou leur taille.");
        throw new Error("Template trop volumineux");
      }
      
      // Appeler la fonction de sauvegarde fournie par le parent
      await onSave(clonedTemplate);
      
      setHasUnsavedChanges(false);
      toast.success("Positions des champs sauvegardées avec succès");
    } catch (error: any) {
      console.error("Erreur lors de la sauvegarde:", error);
      
      // Message d'erreur détaillé
      const errorMessage = error.message || "Erreur inconnue";
      const errorDetails = error.details || "";
      
      toast.error(`Erreur: ${errorMessage}${errorDetails ? ` (${errorDetails})` : ''}`);
      
      // Si c'est un timeout, suggérer une solution
      if (errorMessage.includes("timeout") || saveAttempts > 3) {
        toast.error("Problème de délai d'attente. Essayez de sauvegarder par étapes en réduisant les modifications.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartDrag = useCallback((fieldId: string, offsetX: number, offsetY: number) => {
    if (!isDraggable) return;
    setIsDragging(true);
    setDraggedFieldId(fieldId);
    setDragOffsetX(offsetX);
    setDragOffsetY(offsetY);
  }, [isDraggable]);
  
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
