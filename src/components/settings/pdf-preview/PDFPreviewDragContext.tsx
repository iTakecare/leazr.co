
import React, { createContext, useContext, useState, useCallback } from "react";
import { PDFModel } from "@/utils/pdfModelUtils";

interface DragContextState {
  isDragging: boolean;
  isDraggable: boolean;
  draggedFieldId: string | null;
  dragOffset: { x: number; y: number };
  hasUnsavedChanges: boolean;
}

interface DragContextActions {
  setIsDraggable: (isDraggable: boolean) => void;
  startDrag: (fieldId: string, offsetX: number, offsetY: number) => void;
  updateFieldPosition: (clientX: number, clientY: number, containerRect: DOMRect, zoomLevel: number) => void;
  endDrag: () => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  toggleDragMode: () => void;
}

interface DragContextProviderProps {
  children: React.ReactNode;
  template: PDFModel;
  onTemplateChange: (template: PDFModel) => void;
}

const DragContextState = createContext<DragContextState | undefined>(undefined);
const DragContextActions = createContext<DragContextActions | undefined>(undefined);

export const PDFPreviewDragProvider: React.FC<DragContextProviderProps> = ({ 
  children,
  template,
  onTemplateChange
}) => {
  const [isDraggable, setIsDraggable] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const startDrag = useCallback((fieldId: string, offsetX: number, offsetY: number) => {
    if (!isDraggable) return;
    
    setDraggedFieldId(fieldId);
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
  }, [isDraggable]);

  const updateFieldPosition = useCallback((
    clientX: number, 
    clientY: number, 
    containerRect: DOMRect,
    zoomLevel: number
  ) => {
    if (!isDragging || !draggedFieldId) return;

    // Coordonnées du pointeur par rapport au conteneur
    const relativeX = clientX - containerRect.left - dragOffset.x;
    const relativeY = clientY - containerRect.top - dragOffset.y;
    
    // Conversion en mm (210mm = largeur A4, 297mm = hauteur A4)
    const widthInMm = 210;
    const heightInMm = 297;
    
    // Calcul des coordonnées en mm en tenant compte du zoom
    const xInMm = (relativeX / (containerRect.width / widthInMm)) / zoomLevel;
    const yInMm = (relativeY / (containerRect.height / heightInMm)) / zoomLevel;
    
    // Limiter les coordonnées à l'intérieur de la page
    const newX = Math.max(0, Math.min(xInMm, widthInMm));
    const newY = Math.max(0, Math.min(yInMm, heightInMm));
    
    // Mise à jour de la position du champ
    const updatedFields = template.fields.map(field => {
      if (field.id === draggedFieldId) {
        return {
          ...field,
          position: {
            x: Math.round(newX * 10) / 10, // Arrondir à 1 décimale
            y: Math.round(newY * 10) / 10  // Arrondir à 1 décimale
          }
        };
      }
      return field;
    });

    // Mettre à jour le template
    onTemplateChange({
      ...template,
      fields: updatedFields
    });
    
    setHasUnsavedChanges(true);
  }, [isDragging, draggedFieldId, dragOffset, template, onTemplateChange]);

  const endDrag = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    setDraggedFieldId(null);
  }, [isDragging]);

  const toggleDragMode = useCallback(() => {
    setIsDraggable((prev) => !prev);
  }, []);

  const state: DragContextState = {
    isDragging,
    isDraggable,
    draggedFieldId,
    dragOffset,
    hasUnsavedChanges
  };

  const actions: DragContextActions = {
    setIsDraggable,
    startDrag,
    updateFieldPosition,
    endDrag,
    setHasUnsavedChanges,
    toggleDragMode
  };

  return (
    <DragContextState.Provider value={state}>
      <DragContextActions.Provider value={actions}>
        {children}
      </DragContextActions.Provider>
    </DragContextState.Provider>
  );
};

export const useDragState = (): DragContextState => {
  const context = useContext(DragContextState);
  if (context === undefined) {
    throw new Error('useDragState must be used within a PDFPreviewDragProvider');
  }
  return context;
};

export const useDragActions = (): DragContextActions => {
  const context = useContext(DragContextActions);
  if (context === undefined) {
    throw new Error('useDragActions must be used within a PDFPreviewDragProvider');
  }
  return context;
};
