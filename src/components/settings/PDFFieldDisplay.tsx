
import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

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
    // Vérifier si data est null ou undefined
    if (!data) {
      console.log("Données invalides lors de la résolution de la valeur du champ", pattern);
      return '[Données manquantes]';
    }
    
    // Cas spécial pour l'équipement
    if (pattern === '{equipment_description}') {
      return formatEquipmentData(data.equipment_description, data.equipment_data);
    }
    
    return pattern.replace(/\{([^}]+)\}/g, (match, key) => {
      console.log(`Résolution de ${key} pour le pattern ${pattern}`);
      
      const keyParts = key.split('.');
      let value = data;
      
      for (const part of keyParts) {
        if (value === undefined || value === null) {
          console.log(`La propriété ${part} n'existe pas dans`, value);
          return '[Non disponible]';
        }
        value = value[part];
        console.log(`Accès à ${part}:`, value);
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
      
      // Si c'est un montant, le formater
      if (key === 'monthly_payment' || key === 'amount' || key.includes('price')) {
        try {
          const num = parseFloat(value);
          if (!isNaN(num)) {
            return formatCurrency(num);
          }
        } catch (e) {
          // En cas d'erreur, continuer
        }
      }
      
      return value?.toString() || '[Non disponible]';
    });
  } catch (error) {
    console.error("Erreur lors de la résolution de la valeur:", error);
    return '[Erreur de format]';
  }
};

// Fonction pour formater les données d'équipement de manière structurée
const formatEquipmentData = (equipmentDescription: string | any[], equipmentData?: any[]): string => {
  try {
    let equipment;
    
    // Utiliser les données traitées si disponibles
    if (Array.isArray(equipmentData) && equipmentData.length > 0) {
      equipment = equipmentData;
    } else if (typeof equipmentDescription === 'string') {
      equipment = JSON.parse(equipmentDescription);
    } else if (Array.isArray(equipmentDescription)) {
      equipment = equipmentDescription;
    } else {
      return "Aucun équipement spécifié";
    }
    
    if (Array.isArray(equipment) && equipment.length > 0) {
      // Format plus structuré pour le PDF
      return equipment.map((item, index) => {
        const title = item.title || "Produit sans nom";
        const quantity = item.quantity || 1;
        const monthlyPayment = item.monthlyPayment || 0;
        
        return `${title}\nQuantité : ${quantity}\nMensualité unitaire : ${formatCurrency(monthlyPayment)}`;
      }).join('\n\n');
    }
    
    return "Aucun équipement spécifié";
  } catch (e) {
    console.error("Erreur lors du formatage de l'équipement:", e);
    return "Erreur de formatage des données d'équipement";
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
      console.log(`Résolution du champ: ${field.label || field.id}`, field.value);
      let displayValue = resolveFieldValue(field.value || '', sampleData);
      console.log(`Valeur résolue: "${displayValue}"`);
      
      // Pour l'aperçu, on peut choisir de limiter ou non la longueur
      const isEquipmentField = field.value === '{equipment_description}';
      if (!isEquipmentField && displayValue.length > 50) {
        displayValue = displayValue.substring(0, 47) + '...';
      }
      
      return displayValue;
    } catch (error) {
      console.error("Erreur lors de la résolution de la valeur du champ:", error);
      return "[Erreur]";
    }
  }, [field.value, field.label, field.id, sampleData]);

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
      whiteSpace: field.value === '{equipment_description}' ? 'pre-wrap' : 'nowrap',
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
      title={`Champ: ${field.label || field.id} - Valeur: ${resolvedValue}`}
    >
      {resolvedValue || "[Vide]"}
    </div>
  );
};

export default PDFFieldDisplay;
