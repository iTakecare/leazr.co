
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
    page?: number;
    isVisible?: boolean;
  };
  zoomLevel: number;
  currentPage: number;
  sampleData: any;
  isDraggable: boolean;
  onStartDrag: (fieldId: string, offsetX: number, offsetY: number) => void;
  onDrag: (clientX: number, clientY: number) => void;
  onEndDrag: () => void;
};

// Constante pour la conversion mm en pixels (standard: 1 mm = 3.7795275591 px à 96 DPI)
const MM_TO_PX = 3.7795275591;

// Dimensions d'une page A4 en mm
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;

// Fonction pour résoudre les valeurs des champs avec les données d'exemple
const resolveFieldValue = (pattern: string, sampleData: any, currentPage: number): string => {
  if (!pattern || typeof pattern !== 'string') return '';
  
  // Si le pattern ne contient pas de placeholders, on retourne la valeur directement
  if (!pattern.includes('{')) {
    return pattern;
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
        return `[${key}]`;
      }
      value = value[part];
    }
    
    // Si la valeur est undefined, retourner une valeur explicite
    if (value === undefined || value === null) {
      return `[${key}]`;
    }
    
    // Formatage pour les dates
    if (key === 'created_at' && typeof value === 'string') {
      try {
        return new Date(value).toLocaleDateString();
      } catch (e) {
        return value ? String(value) : `[date]`;
      }
    }
    
    // Formatage pour les montants
    if ((key.includes('amount') || key.includes('payment') || key.includes('price') || 
         key.includes('commission')) && typeof value === 'number') {
      try {
        return formatCurrency(value);
      } catch (e) {
        return typeof value === 'number' ? String(value) : `[montant]`;
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
  // Vérifier si les coordonnées sont dans les limites d'une page A4
  const normalizedPosition = {
    x: Math.min(Math.max(0, field.position.x), PAGE_WIDTH_MM),
    y: Math.min(Math.max(0, field.position.y), PAGE_HEIGHT_MM)
  };
  
  // Calcul précis des positions en pixels à partir des positions en mm
  const xPx = normalizedPosition.x * MM_TO_PX * zoomLevel;
  const yPx = normalizedPosition.y * MM_TO_PX * zoomLevel;
  
  // Style du champ avec les positions calculées précisément
  const style = {
    position: "absolute" as const,
    left: `${xPx}px`,
    top: `${yPx}px`,
    zIndex: 10,
    fontSize: `${(field.style?.fontSize || 9) * zoomLevel}px`,
    fontWeight: field.style?.fontWeight || 'normal',
    fontStyle: field.style?.fontStyle || 'normal',
    textDecoration: field.style?.textDecoration || 'none',
    color: field.style?.color || 'black',
    whiteSpace: "pre-wrap" as const,
    maxWidth: field.id === 'equipment_table' 
      ? `${150 * MM_TO_PX * zoomLevel}px` 
      : `${80 * MM_TO_PX * zoomLevel}px`,
    cursor: isDraggable ? 'move' : 'default',
    border: isDraggable ? '1px dashed blue' : 'none',
    padding: '2px',
    backgroundColor: isDraggable ? 'rgba(200, 200, 255, 0.1)' : 'transparent'
  };
  
  // Gestionnaire de début de glisser-déposer
  const handleDragStart = (e: React.MouseEvent) => {
    if (!isDraggable) return;
    
    // Empêcher le comportement par défaut du navigateur pour éviter les problèmes de drag
    e.preventDefault();
    
    // Calculer l'offset pour maintenir la position relative du curseur pendant le drag
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    // Démarrer le drag
    onStartDrag(field.id, offsetX, offsetY);
    
    // Ajouter les événements de suivi du mouvement de la souris au document
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  // Gestionnaire de mouvement de la souris pendant le glisser-déposer
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggable) return;
    onDrag(e.clientX, e.clientY);
  };
  
  // Gestionnaire de fin de glisser-déposer
  const handleMouseUp = () => {
    if (!isDraggable) return;
    onEndDrag();
    
    // Nettoyer les événements pour éviter les fuites de mémoire
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
  
  // Rendu du contenu du champ avec gestion des cas particuliers
  const renderContent = () => {
    // Cas spécial pour le tableau d'équipement
    if (field.id === 'equipment_table') {
      return renderEquipmentTable(sampleData, zoomLevel);
    }
    
    // Pour tous les autres types de champs, résoudre la valeur
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
