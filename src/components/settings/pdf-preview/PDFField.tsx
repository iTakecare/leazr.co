
import React, { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { useDragState, useDragActions } from "./PDFPreviewDragContext";
import { getOfferEquipment } from "@/services/offerService";

interface PDFFieldProps {
  field: any;
  zoomLevel: number;
  sampleData: any;
  currentPage: number;
}

// Composant pour afficher le tableau d'équipement
const EquipmentTable = ({ equipment, zoomLevel }) => {
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

const PDFField: React.FC<PDFFieldProps> = ({ field, zoomLevel, sampleData, currentPage }) => {
  const { isDraggable } = useDragState();
  const { startDrag } = useDragActions();
  const [equipmentData, setEquipmentData] = useState<any[]>([]);
  
  // Charger les données d'équipement si nécessaire
  useEffect(() => {
    if (field.id === 'equipment_table' && sampleData && sampleData.id) {
      // Fonction pour récupérer et traiter les données d'équipement
      const loadEquipmentData = async () => {
        try {
          // Essayer d'abord de récupérer les équipements depuis la BD
          const dbEquipment = await getOfferEquipment(sampleData.id);
          if (dbEquipment && dbEquipment.length > 0) {
            // Transformer les données pour l'affichage
            const processedEquipment = dbEquipment.map(item => {
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
            
            setEquipmentData(processedEquipment);
          } else {
            // Fallback: utiliser les données JSON si disponibles
            parseJSONEquipment();
          }
        } catch (error) {
          console.error("Erreur lors de la récupération des équipements:", error);
          // Fallback: utiliser les données JSON
          parseJSONEquipment();
        }
      };
      
      // Fonction de fallback pour analyser les données JSON
      const parseJSONEquipment = () => {
        try {
          const jsonData = sampleData.equipment_description;
          if (!jsonData) {
            setEquipmentData([]);
            return;
          }
          
          const parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
          setEquipmentData(Array.isArray(parsed) ? parsed : []);
        } catch (error) {
          console.error("Erreur lors du parsing des données JSON:", error);
          setEquipmentData([]);
        }
      };
      
      // Lancer le chargement des données
      loadEquipmentData();
    }
  }, [field.id, sampleData]);
  
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
  
  // Fonction pour résoudre la valeur du champ en fonction du modèle et des données de l'échantillon
  const resolveFieldValue = (pattern: string | undefined): string => {
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
  
  const renderContent = () => {
    if (field.id === 'equipment_table') {
      return <EquipmentTable equipment={equipmentData} zoomLevel={zoomLevel} />;
    }
    
    return <span>{resolveFieldValue(field.value)}</span>;
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
