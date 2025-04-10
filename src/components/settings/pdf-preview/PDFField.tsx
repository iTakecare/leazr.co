import React from "react";
import { formatCurrency } from "@/lib/utils";
import { useDragState, useDragActions } from "./PDFPreviewDragContext";
import { getOfferEquipment } from "@/services/offerService";

interface PDFFieldProps {
  field: any;
  zoomLevel: number;
  sampleData: any;
  currentPage: number;
}

// Fonction pour analyser les données d'équipement
const parseEquipmentData = async (jsonString: string | any[], offerId?: string) => {
  try {
    if (offerId) {
      // Si l'ID de l'offre est fourni, essayer de récupérer les équipements depuis la BD
      try {
        const equipmentData = await getOfferEquipment(offerId);
        if (equipmentData && equipmentData.length > 0) {
          return equipmentData.map(item => {
            // Convertir les attributs en objet
            const attributes: Record<string, string> = {};
            if (item.attributes && item.attributes.length > 0) {
              item.attributes.forEach(attr => {
                attributes[attr.key] = attr.value;
              });
            }
            
            // Convertir les spécifications en objet
            const specifications: Record<string, string | number> = {};
            if (item.specifications && item.specifications.length > 0) {
              item.specifications.forEach(spec => {
                specifications[spec.key] = spec.value;
              });
            }
            
            return {
              title: item.title,
              quantity: item.quantity,
              monthlyPayment: item.monthly_payment,
              attributes,
              specifications
            };
          });
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des équipements depuis la BD:", error);
        // Continuer avec la méthode de fallback
      }
    }
    
    // Méthode de fallback: analyser le JSON
    if (!jsonString) return [];
    
    if (Array.isArray(jsonString)) return jsonString;
    
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error parsing equipment data:", error);
    return [];
  }
};

// Fonction pour rendre la table d'équipement
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
          <th className="border px-1 py-0.5 text-center">Qté</th>
          <th className="border px-1 py-0.5 text-right">Mensualité</th>
        </tr>
      </thead>
      <tbody>
        {equipment.map((item: any, index: number) => {
          const quantity = parseInt(item.quantity || 1, 10);
          const monthlyPayment = parseFloat(item.monthlyPayment || 0);
          const totalMonthlyPayment = monthlyPayment * quantity;
          
          // Créer une chaîne détaillée pour les attributs et spécifications
          const detailsArray = [];
          
          if (item.attributes && Object.keys(item.attributes).length > 0) {
            Object.entries(item.attributes).forEach(([key, value]) => {
              detailsArray.push(`${key}: ${value}`);
            });
          }
          
          if (item.specifications && Object.keys(item.specifications).length > 0) {
            Object.entries(item.specifications).forEach(([key, value]) => {
              detailsArray.push(`${key}: ${value}`);
            });
          }
          
          const detailsString = detailsArray.join(' • ');
          
          return (
            <React.Fragment key={index}>
              <tr>
                <td className="border px-1 py-0.5 text-left">
                  <div>
                    <div>{item.title}</div>
                    {detailsString && (
                      <div className="text-xs text-gray-500">{detailsString}</div>
                    )}
                  </div>
                </td>
                <td className="border px-1 py-0.5 text-center">{quantity}</td>
                <td className="border px-1 py-0.5 text-right">{formatCurrency(totalMonthlyPayment)}</td>
              </tr>
            </React.Fragment>
          );
        })}
        <tr className="font-bold bg-gray-50">
          <td className="border px-1 py-0.5 text-right" colSpan={2}>Total mensualité :</td>
          <td className="border px-1 py-0.5 text-right">
            {formatCurrency(equipment.reduce((total: number, item: any) => {
              const monthlyPayment = parseFloat(item.monthlyPayment || 0);
              const quantity = parseInt(item.quantity || 1, 10);
              return total + (monthlyPayment * quantity);
            }, 0))}
          </td>
        </tr>
      </tbody>
    </table>
  );
};

// Fonction pour résoudre la valeur du champ en fonction du modèle et des données de l'échantillon
const resolveFieldValue = (pattern: string | undefined, sampleData: any): string => {
  if (!pattern || typeof pattern !== 'string') return '';
  
  return pattern.replace(/\{([^}]+)\}/g, (match, key) => {
    const keyParts = key.split('.');
    let value = sampleData;
    
    for (const part of keyParts) {
      if (value === undefined || value === null) {
        return '';
      }
      value = value[part];
    }
    
    if (key === 'page_number') {
      return String(1);
    }
    
    if (key === 'created_at' && typeof value === 'string') {
      try {
        return new Date(value).toLocaleDateString();
      } catch (e) {
        console.error("Error formatting date:", e);
        return value ? String(value) : '';
      }
    }
    
    if ((key.includes('amount') || key.includes('payment') || key.includes('price') || key.includes('commission')) && typeof value === 'number') {
      try {
        return formatCurrency(value);
      } catch (e) {
        console.error("Error formatting currency:", e);
        return typeof value === 'number' ? String(value) : '';
      }
    }
    
    if (value === undefined || value === null) return '';
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  });
};

const PDFField: React.FC<PDFFieldProps> = ({ field, zoomLevel, sampleData, currentPage }) => {
  const { isDraggable } = useDragState();
  const { startDrag } = useDragActions();
  
  const mmToPx = (mm: number) => mm * 3.7795275591 * zoomLevel;
  
  const xPx = mmToPx(field.position?.x || 0);
  const yPx = mmToPx(field.position?.y || 0);
  
  const fontSize = field.style?.fontSize 
    ? field.style.fontSize * zoomLevel
    : 9 * zoomLevel;
  
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
    cursor: isDraggable ? 'move' : 'default'
  };
  
  const handleDragStart = (e: React.MouseEvent) => {
    if (!isDraggable) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    startDrag(field.id, offsetX, offsetY);
  };
  
  const renderContent = () => {
    if (field.id === 'equipment_table') {
      return renderEquipmentTable(sampleData, zoomLevel);
    }
    
    return <span>{resolveFieldValue(field.value, sampleData)}</span>;
  };
  
  return (
    <div 
      style={style} 
      className={`pdf-field ${isDraggable ? 'cursor-move hover:ring-2 hover:ring-blue-400' : ''}`}
      draggable={isDraggable}
      onMouseDown={handleDragStart}
    >
      {renderContent()}
    </div>
  );
};

export default PDFField;
