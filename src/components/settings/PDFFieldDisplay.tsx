
import React from "react";
import { formatCurrency } from "@/lib/utils";

// Type pour les propriétés du champ PDF
type PDFFieldDisplayProps = {
  field: {
    id: string;
    value: string;
    position: { x: number; y: number };
    style?: {
      fontSize: number;
      fontWeight?: string;
      fontStyle?: string;
      textDecoration?: string;
      color?: string;
    };
    page?: number; // Ajout du numéro de page facultatif
    isVisible?: boolean; // Indique si le champ est visible
  };
  zoomLevel: number;
  currentPage: number;
  sampleData: any;
  isDraggable: boolean;
  onStartDrag: (fieldId: string, offsetX: number, offsetY: number) => void;
  onDrag: (clientX: number, clientY: number) => void;
  onEndDrag: () => void;
};

// Fonction pour résoudre les valeurs des champs avec les données d'exemple
const resolveFieldValue = (pattern: string, sampleData: any, currentPage: number): string => {
  if (!pattern || typeof pattern !== 'string') return '';
  
  // Si le pattern ne contient pas de placeholders, on retourne une valeur démo explicite
  if (!pattern.includes('{')) {
    return `Valeur démo: ${pattern}`;
  }
  
  return pattern.replace(/\{([^}]+)\}/g, (match, key) => {
    // Cas spécial pour le numéro de page
    if (key === 'page_number') {
      return String(currentPage + 1);
    }
    
    const keyParts = key.split('.');
    let value = sampleData;
    
    for (const part of keyParts) {
      if (value === undefined || value === null) {
        return `[Démo: ${key}]`;
      }
      value = value[part];
    }
    
    // Si la valeur est undefined, retourner une valeur démo explicite
    if (value === undefined || value === null) {
      return `[Démo: ${key}]`;
    }
    
    // Formatage pour les dates
    if (key === 'created_at' && typeof value === 'string') {
      try {
        return new Date(value).toLocaleDateString();
      } catch (e) {
        return value ? String(value) : `[Démo: date]`;
      }
    }
    
    // Formatage pour les montants
    if ((key.includes('amount') || key.includes('payment') || key.includes('price') || 
         key.includes('commission')) && typeof value === 'number') {
      try {
        return formatCurrency(value);
      } catch (e) {
        return typeof value === 'number' ? String(value) : `[Démo: montant]`;
      }
    }
    
    // Valeur par défaut
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  });
};

// Fonction pour analyser les données d'équipement à partir d'une chaîne JSON
const parseEquipmentData = (jsonString: string) => {
  try {
    if (!jsonString) return [];
    if (Array.isArray(jsonString)) return jsonString;
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Erreur lors de l'analyse des données d'équipement:", error);
    return [];
  }
};

// Fonction pour calculer le prix total d'un équipement
const calculateItemTotal = (item: any) => {
  const price = parseFloat(item.purchasePrice || 0);
  const quantity = parseInt(item.quantity || 1);
  const margin = parseFloat(item.margin || 0) / 100;
  return price * quantity * (1 + margin);
};

// Rendu du tableau d'équipements
const renderEquipmentTable = (sampleData: any, zoomLevel: number) => {
  const equipment = parseEquipmentData(sampleData.equipment_description);
  
  if (!equipment || equipment.length === 0) {
    return <p className="text-sm italic">Aucun équipement disponible</p>;
  }
  
  return (
    <table className="w-full border-collapse" style={{ fontSize: `${9 * zoomLevel}px` }}>
      <thead>
        <tr className="bg-gray-100">
          <th className="border px-1 py-0.5 text-left">Désignation</th>
          <th className="border px-1 py-0.5 text-right">Prix</th>
          <th className="border px-1 py-0.5 text-center">Qté</th>
          <th className="border px-1 py-0.5 text-center">Marge</th>
          <th className="border px-1 py-0.5 text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        {equipment.map((item: any, index: number) => {
          const totalPrice = calculateItemTotal(item);
          return (
            <tr key={index}>
              <td className="border px-1 py-0.5 text-left">{item.title}</td>
              <td className="border px-1 py-0.5 text-right">{formatCurrency(item.purchasePrice)}</td>
              <td className="border px-1 py-0.5 text-center">{item.quantity}</td>
              <td className="border px-1 py-0.5 text-center">{item.margin}%</td>
              <td className="border px-1 py-0.5 text-right">{formatCurrency(totalPrice)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

const PDFFieldDisplay: React.FC<PDFFieldDisplayProps> = ({
  field,
  zoomLevel,
  currentPage,
  sampleData,
  isDraggable,
  onStartDrag,
  onDrag,
  onEndDrag
}) => {
  // Debug pour voir les champs et leurs positions
  console.log(`Rendering field ${field.id} for page ${field.page}`, field);
  
  // Convertir mm en px avec le zoom appliqué (1 mm = 3.7795275591 px)
  const mmToPx = (mm: number) => mm * 3.7795275591 * zoomLevel;
  
  // Position et style du champ
  const xPx = mmToPx(field.position?.x || 0);
  const yPx = mmToPx(field.position?.y || 0);
  
  // Taille de police ajustée avec le zoom
  const fontSize = field.style?.fontSize 
    ? field.style.fontSize * zoomLevel
    : 9 * zoomLevel;
  
  // Style du champ
  const style = {
    position: "absolute" as const,
    left: `${xPx}px`,
    top: `${yPx}px`,
    zIndex: 5,
    fontSize: `${fontSize}px`,
    fontWeight: field.style?.fontWeight || 'normal',
    fontStyle: field.style?.fontStyle || 'normal',
    textDecoration: field.style?.textDecoration || 'none',
    color: field.style?.color || 'black',
    whiteSpace: "pre-wrap" as const,
    maxWidth: field.id === 'equipment_table' 
      ? `${mmToPx(150)}px` 
      : `${mmToPx(80)}px`,
    cursor: isDraggable ? 'move' : 'default',
    // Ajouter une bordure visible pour débogage
    border: isDraggable ? '1px dashed blue' : 'none',
    padding: '2px',
    backgroundColor: isDraggable ? 'rgba(200, 200, 255, 0.1)' : 'transparent'
  };
  
  // Gestionnaires d'événements pour le drag and drop
  const handleDragStart = (e: React.MouseEvent) => {
    if (!isDraggable) return;
    
    // Empêcher le comportement par défaut du navigateur
    e.preventDefault();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    console.log(`Starting drag for field ${field.id} with offset ${offsetX}, ${offsetY}`);
    onStartDrag(field.id, offsetX, offsetY);
    
    // Ajouter les événements de suivi du mouvement de la souris au document
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggable) return;
    onDrag(e.clientX, e.clientY);
  };
  
  const handleMouseUp = () => {
    if (!isDraggable) return;
    console.log(`Ending drag for field ${field.id}`);
    onEndDrag();
    
    // Nettoyer les événements
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
  
  // Rendu du contenu du champ avec gestion des cas particuliers
  const renderContent = () => {
    if (field.id === 'equipment_table') {
      return renderEquipmentTable(sampleData, zoomLevel);
    }
    
    const resolvedValue = resolveFieldValue(field.value, sampleData, currentPage);
    return <span>{resolvedValue}</span>;
  };
  
  return (
    <div 
      style={style}
      className={`pdf-field ${isDraggable ? 'hover:bg-blue-100 hover:opacity-80' : ''}`}
      onMouseDown={handleDragStart}
    >
      {renderContent()}
    </div>
  );
};

export default PDFFieldDisplay;
