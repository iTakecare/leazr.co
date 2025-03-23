
import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

interface PDFFieldDisplayProps {
  field: any;
  zoomLevel: number;
  currentPage: number;
  sampleData: any;
  isDraggable: boolean;
  onStartDrag: (fieldId: string, offsetX: number, offsetY: number) => void;
  useRealData?: boolean;
}

// Fonction pour résoudre la valeur d'un champ à partir d'un pattern et de données
const resolveFieldValue = (pattern: string, data: any): string => {
  if (!pattern) return '[Valeur manquante]';
  
  try {
    return pattern.replace(/\{([^}]+)\}/g, (match, key) => {
      const keyParts = key.split('.');
      let value = data;
      
      for (const part of keyParts) {
        if (value === undefined || value === null) {
          return '[Non disponible]';
        }
        value = value[part];
      }
      
      // Si c'est un objet, le formater en JSON
      if (typeof value === 'object' && value !== null) {
        try {
          return JSON.stringify(value, null, 2);
        } catch (e) {
          return '[Objet complexe]';
        }
      }
      
      // Si c'est une date, la formater
      if (value instanceof Date || (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/))) {
        try {
          const date = new Date(value);
          return date.toLocaleDateString('fr-FR');
        } catch (e) {
          // En cas d'erreur, retourner la valeur brute
        }
      }
      
      return value?.toString() || '[Non disponible]';
    });
  } catch (error) {
    console.error("Erreur lors de la résolution de la valeur:", error);
    return '[Erreur de format]';
  }
};

const PDFFieldDisplay: React.FC<PDFFieldDisplayProps> = ({
  field,
  zoomLevel,
  currentPage,
  sampleData,
  isDraggable,
  onStartDrag,
  useRealData = false
}) => {
  // Calculer la valeur résolue une seule fois
  const resolvedValue = useMemo(() => {
    try {
      let displayValue = resolveFieldValue(field.value || '', sampleData);
      
      // Limiter la longueur pour l'affichage
      if (displayValue.length > 50) {
        displayValue = displayValue.substring(0, 47) + '...';
      }
      
      return displayValue;
    } catch (error) {
      console.error("Erreur lors de la résolution de la valeur du champ:", error);
      return "[Erreur]";
    }
  }, [field.value, sampleData]);

  // Style et position du champ
  const fieldStyle = useMemo(() => {
    const style: React.CSSProperties = {
      left: `${field.position?.x || 0}mm`,
      top: `${field.position?.y || 0}mm`,
      transform: `scale(${zoomLevel})`,
      transformOrigin: 'top left',
      fontSize: `${(field.style?.fontSize || 10) + (useRealData ? 0 : 1)}px`,
      fontFamily: 'Arial, sans-serif',
      position: 'absolute',
      cursor: isDraggable ? 'move' : 'default',
      userSelect: 'none',
      backgroundColor: useRealData ? 'rgba(120, 170, 255, 0.1)' : 'rgba(255, 180, 120, 0.1)',
      border: useRealData ? '1px dashed rgba(0, 100, 255, 0.4)' : '1px dashed rgba(255, 130, 0, 0.4)',
      borderRadius: '2px',
      padding: '1px 3px',
      maxWidth: '200px',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      zIndex: 10
    };
    
    if (field.style?.fontWeight === 'bold') {
      style.fontWeight = 'bold';
    }
    
    if (field.style?.fontStyle === 'italic') {
      style.fontStyle = 'italic';
    }
    
    return style;
  }, [field, zoomLevel, isDraggable, useRealData]);

  // Gestion du drag and drop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isDraggable) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    onStartDrag(field.id, offsetX, offsetY);
    e.preventDefault();
  };
  
  return (
    <div
      className={cn(
        "text-field", 
        isDraggable ? "cursor-move hover:ring-2 hover:ring-blue-400" : "pointer-events-none"
      )}
      style={fieldStyle}
      onMouseDown={handleMouseDown}
      title={`Champ: ${field.label || field.id}`}
    >
      {resolvedValue || "[Vide]"}
    </div>
  );
};

export default PDFFieldDisplay;
